import * as Network from 'expo-network';
import { useState, useEffect } from 'react';

// Hook para detectar conexión
export const useConexionInternet = () => {
  const [estaConectado, setEstaConectado] = useState(true);

  useEffect(() => {
    verificarConexion();

    const intervalo = setInterval(verificarConexion, 10000);

    return () => clearInterval(intervalo);
  }, []);

  const verificarConexion = async () => {
    try {
      const estado = await Network.getNetworkStateAsync();
      setEstaConectado(estado.isConnected && estado.isInternetReachable);
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setEstaConectado(false);
    }
  };

  return { estaConectado, verificarConexion };
};

// Función standalone para verificar conexión
export const verificarConexionInternet = async () => {
  try {
    const estado = await Network.getNetworkStateAsync();
    return estado.isConnected && estado.isInternetReachable;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};