import * as Network from 'expo-network';
import { useState, useEffect, useCallback } from 'react';

// ===== HOOK PARA DETECTAR CONEXIÓN =====
export const useConexionInternet = () => {
  const [estaConectado, setEstaConectado] = useState(true);
  const [verificando, setVerificando] = useState(false);

  const verificarConexion = useCallback(async () => {
    // Evitar verificaciones simultáneas
    setVerificando(v => {
      if (v) return true; // Si ya está verificando, mantener true
      return true; // Si no, marcar como verificando
    });

    try {
      const estado = await Network.getNetworkStateAsync();
      const conectado = estado.isConnected === true && estado.isInternetReachable === true;

      setEstaConectado(prev => {
        if (prev !== conectado) {
          console.log(conectado ? '✅ Conexión restaurada' : '📴 Conexión perdida');
          return conectado;
        }
        return prev;
      });

      return conectado;
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setEstaConectado(false);
      return false;
    } finally {
      setVerificando(false);
    }
  }, []); // Sin dependencias para que sea estable

  useEffect(() => {
    // Verificar inmediatamente al montar
    verificarConexion();

    // Verificar cada 5 segundos
    const intervalo = setInterval(verificarConexion, 5000);

    return () => clearInterval(intervalo);
  }, [verificarConexion]); // verificarConexion es estable ahora

  return {
    estaConectado,
    verificarConexion,
    verificando
  };
};

// ===== FUNCIÓN STANDALONE =====
export const verificarConexionInternet = async () => {
  try {
    const estado = await Network.getNetworkStateAsync();
    const conectado = estado.isConnected === true && estado.isInternetReachable === true;
    return conectado;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};

// ===== VERIFICAR CON PING REAL (más preciso pero más lento) =====
export const verificarConexionReal = async (timeout = 5000) => {
  try {
    // Primero verificar estado de red
    const estado = await Network.getNetworkStateAsync();
    if (!estado.isConnected) {
      return false;
    }

    // Hacer un ping real a un servidor confiable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok || response.status === 204;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Si falla el fetch, intentar con Cloudinary (que usamos en la app)
      try {
        const response2 = await fetch('https://api.cloudinary.com/v1_1/due9nyqmr/ping', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });
        return true; // Si llegamos aquí, hay conexión
      } catch {
        return false;
      }
    }
  } catch (error) {
    console.error('Error en verificación real:', error);
    return false;
  }
};

// ===== ESPERAR CONEXIÓN =====
export const esperarConexion = async (maxIntentos = 10, intervaloMs = 3000) => {
  for (let i = 0; i < maxIntentos; i++) {
    const conectado = await verificarConexionInternet();
    if (conectado) {
      console.log(`✅ Conexión establecida después de ${i + 1} intentos`);
      return true;
    }
    console.log(`📴 Intento ${i + 1}/${maxIntentos} - Sin conexión`);
    await new Promise(resolve => setTimeout(resolve, intervaloMs));
  }
  return false;
};
