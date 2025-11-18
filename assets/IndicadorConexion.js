import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../assets/estilos';

export default function IndicadorConexion({ estaConectado, datosPendientes = 0 }) {
  if (estaConectado && datosPendientes === 0) {
    return null;
  }

  return (
    <View style={[
      estilos.contenedor,
      { backgroundColor: estaConectado ? '#ffa500' : '#e74c3c' }
    ]}>
      <Ionicons 
        name={estaConectado ? "sync" : "cloud-offline"} 
        size={16} 
        color="#fff" 
      />
      <Text style={estilos.texto}>
        {estaConectado 
          ? `Sincronizando ${datosPendientes} mantenimiento(s)...` 
          : 'Modo Offline - Los datos se guardarán localmente'
        }
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  texto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});