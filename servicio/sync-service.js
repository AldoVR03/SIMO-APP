import { db } from './firebase-config';
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  obtenerMantenimientosOffline,
  limpiarMantenimientosOffline,
  guardarUltimaSincronizacion,
  guardarPlantillas,
  guardarMantenimientosPendientes,
} from './offline-storage';
import { verificarConexionInternet } from './network-service';

// ===== SUBIR IMAGEN A CLOUDINARY =====
const uploadToCloudinary = async (uri) => {
  const data = new FormData();
  data.append("file", {
    uri,
    type: "image/jpeg",
    name: `evidencia_${Date.now()}.jpg`,
  });
  data.append("upload_preset", "SIMO-APP-Evidencia-Firma");

  try {
    const res = await fetch("https://api.cloudinary.com/v1_1/due9nyqmr/image/upload", {
      method: "POST",
      body: data,
    });
    const json = await res.json();
    return json.secure_url;
  } catch (err) {
    console.error("Error subiendo a Cloudinary:", err);
    return null;
  }
};

// ===== DESCARGAR TODAS LAS PLANTILLAS DESDE FIRESTORE =====
export const descargarPlantillas = async () => {
  try {
    const conectado = await verificarConexionInternet();
    if (!conectado) {
      console.log('❌ Sin conexión para descargar plantillas');
      return false;
    }

    console.log('📥 Descargando todas las plantillas...');

    const plantillasRef = collection(db, 'plantilla');
    const snapshot = await getDocs(plantillasRef);

    if (!snapshot.empty) {
      const plantillas = {};
      snapshot.forEach((docSnap) => {
        plantillas[docSnap.id] = docSnap.data();
      });
      await guardarPlantillas(plantillas);
      console.log('✅ Plantillas descargadas:', Object.keys(plantillas).length);
      return true;
    } else {
      console.log('⚠️ No hay plantillas en Firestore');
      return false;
    }
  } catch (error) {
    console.error('❌ Error descargando plantillas:', error);
    return false;
  }
};

// ===== DESCARGAR PLANIFICACIÓN (Mantenimientos asignados) =====
export const descargarPlanificacion = async (uidMantenedor) => {
  try {
    const conectado = await verificarConexionInternet();
    if (!conectado) {
      console.log('❌ Sin conexión para descargar planificación');
      return false;
    }

    console.log('📥 Descargando planificación...');

    const mantenimientosRef = collection(db, 'mantenimientos');
    const q = query(
      mantenimientosRef,
      where('mantenedor_uid', '==', uidMantenedor),
      where('estado', '==', 'pendiente')
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const mantenimientos = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      await guardarMantenimientosPendientes(mantenimientos);
      console.log('✅ Planificación descargada:', mantenimientos.length, 'mantenimientos');
      return true;
    } else {
      console.log('⚠️ No hay mantenimientos pendientes');
      await guardarMantenimientosPendientes([]);
      return true;
    }
  } catch (error) {
    console.error('❌ Error descargando planificación:', error);
    return false;
  }
};

// ===== SINCRONIZAR MANTENIMIENTOS OFFLINE A FIRESTORE =====
export const sincronizarMantenimientosOffline = async () => {
  try {
    const conectado = await verificarConexionInternet();
    if (!conectado) {
      console.log('❌ Sin conexión para sincronizar');
      return { success: false, message: 'Sin conexión a internet' };
    }

    const mantenimientosOffline = await obtenerMantenimientosOffline();

    if (mantenimientosOffline.length === 0) {
      console.log('ℹ️ No hay mantenimientos offline para sincronizar');
      return { success: true, sincronizados: 0 };
    }

    console.log(`📤 Sincronizando ${mantenimientosOffline.length} mantenimientos...`);

    let sincronizados = 0;
    const errores = [];

    for (const mantenimiento of mantenimientosOffline) {
      try {
        // 1. Subir imágenes a Cloudinary si hay URIs locales
        const imagenesSubidas = [];
        if (mantenimiento.imagenes && mantenimiento.imagenes.length > 0) {
          for (const imagenUri of mantenimiento.imagenes) {
            if (imagenUri.startsWith('file://')) {
              const cloudUrl = await uploadToCloudinary(imagenUri);
              if (cloudUrl) {
                imagenesSubidas.push(cloudUrl);
              }
            } else {
              imagenesSubidas.push(imagenUri);
            }
          }
        }

        // 2. Crear objeto de informe
        const informeData = {
          ...mantenimiento,
          imagenes: imagenesSubidas,
          sincronizado_desde_offline: true,
          timestamp_sincronizacion: new Date().toISOString(),
        };

        // 3. Guardar en Firestore
        const informesRef = collection(db, 'informes');
        await addDoc(informesRef, informeData);

        // 4. Actualizar estado del mantenimiento
        if (mantenimiento.mantenimientoId) {
          const mantenimientoRef = doc(db, 'mantenimientos', mantenimiento.mantenimientoId);
          await updateDoc(mantenimientoRef, {
            estado: 'completado',
            fecha_completado: new Date().toISOString(),
          });
        }

        sincronizados++;
        console.log(`✅ Mantenimiento sincronizado`);
      } catch (error) {
        console.error('❌ Error sincronizando mantenimiento:', error);
        errores.push(mantenimiento.mantenimientoId);
      }
    }

    if (sincronizados === mantenimientosOffline.length) {
      await limpiarMantenimientosOffline();
      await guardarUltimaSincronizacion();
      console.log('✅ Todos los mantenimientos sincronizados');
    }

    return {
      success: true,
      sincronizados,
      total: mantenimientosOffline.length,
      errores,
    };
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return { success: false, message: error.message };
  }
};

// ===== VERIFICAR SI HAY DATOS PENDIENTES =====
export const hayDatosPendientesSincronizar = async () => {
  try {
    const mantenimientosOffline = await obtenerMantenimientosOffline();
    return mantenimientosOffline.length > 0;
  } catch (error) {
    console.error('❌ Error verificando datos pendientes:', error);
    return false;
  }
};