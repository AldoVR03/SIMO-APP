import { db } from './firebase-config';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import {
  obtenerMantenimientosOffline,
  eliminarMantenimientoOffline,
  guardarUltimaSincronizacion,
  guardarPlantillas,
  guardarPlanificacionSemanal,
  obtenerPlantillas,
  guardarImagenLocal,
  obtenerRangoSemanal,
  formatearFecha,
} from './offline-storage';
import { verificarConexionInternet } from './network-service';

// ===== CONFIGURACIÓN CLOUDINARY =====
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/due9nyqmr/image/upload";
const CLOUDINARY_PRESET = "SIMO-APP-Evidencia-Firma";

// ===== SUBIR IMAGEN A CLOUDINARY =====
const subirACloudinary = async (uri) => {
  try {
    if (!uri) return null;

    // Si ya es una URL de Cloudinary, devolverla
    if (uri.startsWith('https://res.cloudinary.com')) {
      return uri;
    }

    const formData = new FormData();

    // Si es un data URI (base64)
    if (uri.startsWith('data:image')) {
      formData.append("file", uri);
    } else {
      // Si es un archivo local
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: `imagen_${Date.now()}.jpg`,
      });
    }

    formData.append("upload_preset", CLOUDINARY_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const json = await response.json();

    if (json.secure_url) {
      console.log('✅ Imagen subida a Cloudinary');
      return json.secure_url;
    } else {
      console.error('❌ Error en Cloudinary:', json);
      return null;
    }
  } catch (error) {
    console.error("❌ Error subiendo a Cloudinary:", error);
    return null;
  }
};

// ===== PROCESAR IMAGEN (ONLINE/OFFLINE) =====
export const procesarImagenOffline = async (uri) => {
  try {
    // Intentar verificar conexión, pero no bloquear si falla
    let conectado = false;
    try {
      conectado = await verificarConexionInternet();
    } catch (e) {
      console.warn('⚠️ Error verificando conexión en procesarImagenOffline:', e);
      conectado = false;
    }

    if (conectado) {
      console.log('📤 Subiendo imagen a Cloudinary...');
      const cloudUrl = await subirACloudinary(uri);

      if (cloudUrl) {
        return { tipo: 'cloud', url: cloudUrl };
      }
    }

    // Sin conexión o fallo en subida: guardar localmente
    console.log('📴 Guardando imagen localmente...');
    const nombreArchivo = `img_${Date.now()}.jpg`;
    const rutaLocal = await guardarImagenLocal(uri, nombreArchivo);
    return { tipo: 'local', url: rutaLocal || uri };

  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    // En el peor de los casos, devolver la URI original para no perderla
    return { tipo: 'local', url: uri };
  }
};

// ===== DESCARGAR DATOS PARA UNA SEMANA =====
export const descargarDatosSemana = async () => {
  try {
    const conectado = await verificarConexionInternet();
    if (!conectado) {
      console.log('📴 Sin conexión para descargar datos');
      return { success: false, message: 'Sin conexión' };
    }

    console.log('📥 Descargando datos de la semana...');
    const { inicio, fin, inicioStr, finStr } = obtenerRangoSemanal();
    console.log(`📅 Rango: ${inicioStr} a ${finStr}`);

    // 1. Obtener todos los equipos de planificación
    const planificacionRef = collection(db, 'planificacion');
    const planificacionSnapshot = await getDocs(planificacionRef);

    const todosLosDatos = [];
    const plantillasADescargar = new Set();

    // 2. Para cada equipo, obtener sus mantenimientos de la semana
    for (const equipoDoc of planificacionSnapshot.docs) {
      const equipoId = equipoDoc.id;
      const equipoData = equipoDoc.data();

      // Obtener mantenimientos de este equipo
      const mantenimientosRef = collection(db, 'planificacion', equipoId, 'mantenimientos');
      const mantenimientosSnapshot = await getDocs(mantenimientosRef);

      for (const mantDoc of mantenimientosSnapshot.docs) {
        const mantData = mantDoc.data();
        const fechaMant = mantData.fecha;

        // Filtrar por rango de fechas
        if (fechaMant >= inicioStr && fechaMant <= finStr) {
          todosLosDatos.push({
            equipoId: equipoId,
            equipo: equipoData.equipo,
            codigo_sgs: equipoData.codigo_sgs || equipoId,
            mantenimientoId: mantDoc.id,
            fecha: fechaMant,
            estado: mantData.estado,
            fechaCompletado: mantData.fechaCompletado || null,
          });

          // Agregar a la lista de plantillas a descargar
          plantillasADescargar.add(equipoId);
        }
      }
    }

    console.log(`✅ ${todosLosDatos.length} mantenimientos encontrados para la semana`);

    // 3. Guardar planificación
    await guardarPlanificacionSemanal(todosLosDatos);

    // 4. Descargar plantillas necesarias
    if (plantillasADescargar.size > 0) {
      await descargarPlantillasEspecificas([...plantillasADescargar]);
    }

    return {
      success: true,
      mantenimientos: todosLosDatos.length,
      plantillas: plantillasADescargar.size
    };

  } catch (error) {
    console.error('❌ Error descargando datos de semana:', error);
    return { success: false, message: error.message };
  }
};

// ===== DESCARGAR PLANTILLAS ESPECÍFICAS =====
const descargarPlantillasEspecificas = async (codigosSgs) => {
  try {
    console.log(`📥 Descargando ${codigosSgs.length} plantillas...`);

    const plantillasExistentes = await obtenerPlantillas();
    const plantillasNuevas = { ...plantillasExistentes };
    let descargadas = 0;

    for (const codigo of codigosSgs) {
      // Si ya existe, saltar
      if (plantillasNuevas[codigo]) {
        continue;
      }

      try {
        const plantillaRef = doc(db, 'plantilla', codigo);
        const snapshot = await getDoc(plantillaRef);

        if (snapshot.exists()) {
          plantillasNuevas[codigo] = snapshot.data();
          descargadas++;
        }
      } catch (error) {
        console.error(`❌ Error descargando plantilla ${codigo}:`, error);
      }
    }

    if (descargadas > 0) {
      await guardarPlantillas(plantillasNuevas);
      console.log(`✅ ${descargadas} plantillas nuevas descargadas`);
    }

    return descargadas;
  } catch (error) {
    console.error('❌ Error descargando plantillas:', error);
    return 0;
  }
};

// ===== SINCRONIZAR MANTENIMIENTOS OFFLINE =====
export const sincronizarMantenimientosOffline = async () => {
  try {
    const conectado = await verificarConexionInternet();
    if (!conectado) {
      console.log('📴 Sin conexión para sincronizar');
      return { success: false, message: 'Sin conexión', sincronizados: 0 };
    }

    const pendientes = await obtenerMantenimientosOffline();

    if (pendientes.length === 0) {
      console.log('ℹ️ No hay mantenimientos pendientes de sincronizar');
      return { success: true, sincronizados: 0 };
    }

    console.log(`📤 Sincronizando ${pendientes.length} mantenimientos...`);

    let sincronizados = 0;
    const errores = [];

    for (const mantenimiento of pendientes) {
      try {
        const resultado = await sincronizarUnMantenimiento(mantenimiento);

        if (resultado.success) {
          // Eliminar de la lista offline
          await eliminarMantenimientoOffline(mantenimiento.mantenimientoId);
          sincronizados++;
          console.log(`✅ Mantenimiento ${mantenimiento.mantenimientoId} sincronizado`);
        } else {
          errores.push({ id: mantenimiento.mantenimientoId, error: resultado.error });
        }
      } catch (error) {
        console.error(`❌ Error sincronizando ${mantenimiento.mantenimientoId}:`, error);
        errores.push({ id: mantenimiento.mantenimientoId, error: error.message });
      }
    }

    if (sincronizados > 0) {
      await guardarUltimaSincronizacion();
    }

    console.log(`✅ Sincronización completada: ${sincronizados}/${pendientes.length}`);

    return {
      success: true,
      sincronizados,
      total: pendientes.length,
      errores,
    };

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return { success: false, message: error.message, sincronizados: 0 };
  }
};

// ===== SINCRONIZAR UN MANTENIMIENTO (ESTRUCTURA ESTRICTA) =====
const sincronizarUnMantenimiento = async (mantenimiento) => {
  try {
    const {
      mantenimientoId,
      informe,
      respuestas,
      imagenes = [],
      firmas = {},
      respaldos = {},
      nombres = {},
      usuario,
    } = mantenimiento;

    // 1. Subir imágenes de evidencia a Cloudinary
    const evidenciasUrls = [];
    for (const uri of imagenes) {
      if (uri.startsWith('file://') || !uri.startsWith('http')) {
        const cloudUrl = await subirACloudinary(uri);
        if (cloudUrl) evidenciasUrls.push(cloudUrl);
      } else {
        evidenciasUrls.push(uri);
      }
    }

    // 2. Subir firmas a Cloudinary
    const firmasUrls = {};
    for (const [key, valor] of Object.entries(firmas)) {
      if (valor) {
        if (valor.startsWith('data:image') || valor.startsWith('file://')) {
          const cloudUrl = await subirACloudinary(valor);
          if (cloudUrl) firmasUrls[key] = cloudUrl;
        } else {
          firmasUrls[key] = valor;
        }
      }
    }

    // 3. Subir respaldos a Cloudinary
    const respaldosUrls = {};
    for (const [key, uri] of Object.entries(respaldos)) {
      if (uri) {
        if (uri.startsWith('file://') || !uri.startsWith('http')) {
          const cloudUrl = await subirACloudinary(uri);
          if (cloudUrl) respaldosUrls[key] = cloudUrl;
        } else {
          respaldosUrls[key] = uri;
        }
      }
    }

    // 4. Determinar estado final
    const firmasRequeridas = ['firma_mantenedor', 'firma_supervisor', 'firma_a_calidad_dgm'];
    const faltanFirmas = firmasRequeridas.some(key => !firmasUrls[key]);
    const estadoFinal = faltanFirmas ? "Faltante de firmas" : "Completado";

    // 5. Crear documento del informe con ESTRUCTURA ESTRICTA
    const informeData = {
      codigo_sgs: informe?.codigo_sgs || informe?.id || "SIN_CODIGO",
      equipo: informe?.equipo || "Equipo no definido",
      estado: estadoFinal,
      evidencias: evidenciasUrls,
      fecha: serverTimestamp(),
      firmas: firmasUrls,
      id_interno: informe?.id || informe?.codigo_sgs || "SIN_ID",
      marca: informe?.marca || "No especificado",
      modelo: informe?.modelo || "No especificado",
      nombres: nombres,
      numero_serie: informe?.numero_serie || "No especificado",
      respaldos: respaldosUrls,
      respuestas: respuestas || {},
      usuario: usuario || "Usuario Desconocido"
    };

    // 6. Guardar en informePreventivo
    const docRef = await addDoc(collection(db, 'informePreventivo'), informeData);
    console.log(`✅ Informe guardado con ID: ${docRef.id}`);

    // 7. Actualizar estado en planificación
    const equipoId = informe?.codigo_sgs || informe?.id;

    if (equipoId && mantenimientoId) {
      try {
        const mantenimientoRef = doc(
          db,
          'planificacion',
          equipoId,
          'mantenimientos',
          mantenimientoId
        );

        const datosActualizacion = {
          estado: estadoFinal,
          informeId: docRef.id,
          fechaActualizacion: serverTimestamp(),
        };

        if (estadoFinal === "Completado") {
          datosActualizacion.fechaCompletado = formatearFecha(new Date());
        }

        await updateDoc(mantenimientoRef, datosActualizacion);
        console.log(`✅ Estado actualizado en planificacion`);
      } catch (updateError) {
        console.error('⚠️ Error actualizando planificación:', updateError);
      }
    }

    return { success: true, informeId: docRef.id };

  } catch (error) {
    console.error('❌ Error sincronizando mantenimiento:', error);
    return { success: false, error: error.message };
  }
};

// ===== VERIFICAR DATOS PENDIENTES =====
export const hayDatosPendientesSincronizar = async () => {
  try {
    const pendientes = await obtenerMantenimientosOffline();
    return pendientes.length > 0;
  } catch (error) {
    return false;
  }
};

export const contarPendientes = async () => {
  try {
    const pendientes = await obtenerMantenimientosOffline();
    return pendientes.length;
  } catch (error) {
    return 0;
  }
};

// ===== INFORMACIÓN DE ESTADO =====
export const obtenerInfoSincronizacion = async () => {
  try {
    const pendientes = await obtenerMantenimientosOffline();
    const { inicioStr, finStr } = obtenerRangoSemanal();

    return {
      pendientes: pendientes.length,
      rangoSemana: `${inicioStr} - ${finStr}`,
      detalles: pendientes.map(p => ({
        id: p.mantenimientoId,
        equipo: p.informe?.equipo,
        fecha: p.timestamp_offline,
      })),
    };
  } catch (error) {
    console.error('❌ Error obteniendo info de sincronización:', error);
    return { pendientes: 0, rangoSemana: '', detalles: [] };
  }
};
