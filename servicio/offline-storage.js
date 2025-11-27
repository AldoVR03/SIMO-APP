import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// ===== CLAVES DE ALMACENAMIENTO =====
const KEYS = {
  PLANTILLAS: '@simo_plantillas',
  MANTENIMIENTOS_PENDIENTES: '@simo_mantenimientos_pendientes',
  MANTENIMIENTOS_OFFLINE: '@simo_mantenimientos_offline',
  IMAGENES_CACHE: '@simo_imagenes_cache',
  ULTIMA_SINCRONIZACION: '@simo_ultima_sync',
};

// ===== PLANTILLAS (equipos) =====
export const guardarPlantillas = async (plantillas) => {
  try {
    await AsyncStorage.setItem(KEYS.PLANTILLAS, JSON.stringify(plantillas));
    console.log('✅ Plantillas guardadas offline');
  } catch (error) {
    console.error('❌ Error guardando plantillas:', error);
  }
};

export const obtenerPlantillas = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PLANTILLAS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('❌ Error obteniendo plantillas:', error);
    return {};
  }
};

// ===== MANTENIMIENTOS PENDIENTES =====
export const guardarMantenimientosPendientes = async (mantenimientos) => {
  try {
    await AsyncStorage.setItem(
      KEYS.MANTENIMIENTOS_PENDIENTES,
      JSON.stringify(mantenimientos)
    );
    console.log('✅ Mantenimientos pendientes guardados offline');
  } catch (error) {
    console.error('❌ Error guardando mantenimientos pendientes:', error);
  }
};

export const obtenerMantenimientosPendientes = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MANTENIMIENTOS_PENDIENTES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error obteniendo mantenimientos pendientes:', error);
    return [];
  }
};

// ===== MANTENIMIENTOS COMPLETADOS OFFLINE =====
export const guardarMantenimientoOffline = async (mantenimiento) => {
  try {
    const mantenimientosOffline = await obtenerMantenimientosOffline();
    mantenimientosOffline.push({
      ...mantenimiento,
      timestamp_offline: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      KEYS.MANTENIMIENTOS_OFFLINE,
      JSON.stringify(mantenimientosOffline)
    );
    console.log('✅ Mantenimiento guardado offline para sincronización posterior');
    return true;
  } catch (error) {
    console.error('❌ Error guardando mantenimiento offline:', error);
    return false;
  }
};

export const actualizarMantenimientoOffline = async (mantenimientoActualizado) => {
  try {
    const mantenimientos = await obtenerMantenimientosOffline();
    const index = mantenimientos.findIndex(m => m.mantenimientoId === mantenimientoActualizado.mantenimientoId);

    if (index !== -1) {
      mantenimientos[index] = {
        ...mantenimientos[index],
        ...mantenimientoActualizado,
        timestamp_offline: new Date().toISOString() // Actualizar timestamp
      };

      await AsyncStorage.setItem(KEYS.MANTENIMIENTOS_OFFLINE, JSON.stringify(mantenimientos));
      console.log('✅ Mantenimiento offline actualizado correctamente');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error actualizando mantenimiento offline:', error);
    return false;
  }
};

export const obtenerMantenimientosOffline = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MANTENIMIENTOS_OFFLINE);
    const mantenimientos = data ? JSON.parse(data) : [];
    console.log(`📦 Mantenimientos offline encontrados: ${mantenimientos.length}`);
    return mantenimientos;
  } catch (error) {
    console.error('❌ Error obteniendo mantenimientos offline:', error);
    return [];
  }
};

export const limpiarMantenimientosOffline = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.MANTENIMIENTOS_OFFLINE);
    console.log('✅ Mantenimientos offline limpiados');
  } catch (error) {
    console.error('❌ Error limpiando mantenimientos offline:', error);
  }
};

export const eliminarMantenimientoOffline = async (mantenimientoId) => {
  try {
    const mantenimientos = await obtenerMantenimientosOffline();
    const nuevosMantenimientos = mantenimientos.filter(m => m.mantenimientoId !== mantenimientoId);

    await AsyncStorage.setItem(
      KEYS.MANTENIMIENTOS_OFFLINE,
      JSON.stringify(nuevosMantenimientos)
    );
    console.log(`✅ Mantenimiento ${mantenimientoId} eliminado de offline`);
    return true;
  } catch (error) {
    console.error('❌ Error eliminando mantenimiento offline:', error);
    return false;
  }
};

export const formatearFecha = (fecha) => {
  if (!fecha) return null;
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ===== IMÁGENES EN CACHÉ =====
export const guardarImagenLocal = async (uri, nombreArchivo) => {
  try {
    console.log('💾 Guardando imagen localmente:', uri);

    const directorioCache = `${FileSystem.documentDirectory}imagenes_cache/`;

    // Verificar si existe el directorio, si no, crearlo
    const dirInfo = await FileSystem.getInfoAsync(directorioCache);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directorioCache, { intermediates: true });
      console.log('📁 Directorio de cache creado');
    }

    const rutaLocal = `${directorioCache}${nombreArchivo}`;

    // Copiar el archivo a la ubicación local
    await FileSystem.copyAsync({
      from: uri,
      to: rutaLocal,
    });

    console.log('✅ Imagen guardada localmente en:', rutaLocal);
    return rutaLocal;
  } catch (error) {
    console.error('❌ Error guardando imagen local:', error);
    console.error('   URI:', uri);
    console.error('   Nombre:', nombreArchivo);
    return null;
  }
};

export const obtenerImagenLocal = async (nombreArchivo) => {
  try {
    const rutaLocal = `${FileSystem.documentDirectory}imagenes_cache/${nombreArchivo}`;
    const info = await FileSystem.getInfoAsync(rutaLocal);

    if (info.exists) {
      console.log('✅ Imagen local encontrada:', rutaLocal);
      return rutaLocal;
    }
    console.log('⚠️ Imagen local no encontrada:', rutaLocal);
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo imagen local:', error);
    return null;
  }
};

// ===== ÚLTIMA SINCRONIZACIÓN =====
export const guardarUltimaSincronizacion = async () => {
  try {
    const fechaActual = new Date().toISOString();
    await AsyncStorage.setItem(KEYS.ULTIMA_SINCRONIZACION, fechaActual);
    console.log('✅ Última sincronización guardada:', fechaActual);
  } catch (error) {
    console.error('❌ Error guardando última sincronización:', error);
  }
};

export const obtenerUltimaSincronizacion = async () => {
  try {
    const fecha = await AsyncStorage.getItem(KEYS.ULTIMA_SINCRONIZACION);
    return fecha ? new Date(fecha) : null;
  } catch (error) {
    console.error('❌ Error obteniendo última sincronización:', error);
    return null;
  }
};

// ===== LIMPIAR TODO =====
export const limpiarAlmacenamientoOffline = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.PLANTILLAS,
      KEYS.MANTENIMIENTOS_PENDIENTES,
      KEYS.MANTENIMIENTOS_OFFLINE,
      KEYS.IMAGENES_CACHE,
      KEYS.ULTIMA_SINCRONIZACION,
    ]);

    const directorioCache = `${FileSystem.documentDirectory}imagenes_cache/`;
    const dirInfo = await FileSystem.getInfoAsync(directorioCache);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(directorioCache, { idempotent: true });
    }

    console.log('✅ Almacenamiento offline completamente limpiado');
  } catch (error) {
    console.error('❌ Error limpiando almacenamiento offline:', error);
  }
};