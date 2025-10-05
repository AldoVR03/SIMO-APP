import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// Import condicional para evitar errores en EAS Build
const SignatureCanvas =
  Platform.OS !== 'web' ? require('react-native-signature-canvas').default : () => null;

export default function Firma({ navigation, route }) {
  console.log("Datos recibidos en Firma:", route.params);
  const {
    equipo = 'Equipo no definido',
    informe = {},
    respuestas = {},
    imagenes = [],
    mantenimientoId, 
  } = route?.params || {};

  const [firmas, setFirmas] = useState({
    firma_mantenedor: null,
    firma_supervisor: null,
    firma_a_calidad_dgm: null,
  });

  const [respaldos, setRespaldos] = useState({
    firma_mantenedor_Respaldo: null,
    firma_supervisor_Respaldo: null,
    firma_a_calidad_dgm_Respaldo: null,
  });

  const canvasRefs = {
    mantenedor: useRef(),
    supervisor: useRef(),
    calidad: useRef(),
  };

  const roles = ['mantenedor', 'supervisor', 'calidad'];

  const getFirmaKey = (rol) => {
    if (rol === 'calidad') {
      return 'firma_a_calidad_dgm';
    }
    return `firma_${rol}`;
  };

  const getRespaldoKey = (rol) => {
    if (rol === 'calidad') {
      return 'firma_a_calidad_dgm_Respaldo';
    }
    return `firma_${rol}_Respaldo`;
  };

  const seleccionarImagen = async (rol) => {
    const key = getRespaldoKey(rol);
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!resultado.canceled) {
      setRespaldos({ ...respaldos, [key]: resultado.assets[0].uri });
    }
  };

  
  const manejarFirma = (base64, rol) => {
  const key = getFirmaKey(rol);
  // el prefijo necesario para que la imagen se pueda mostrar
  const firmaConPrefijo = `data:image/png;base64,${base64}`; 
  setFirmas({ ...firmas, [key]: firmaConPrefijo });
  };

  const limpiarFirma = (rol) => {
    const key = getFirmaKey(rol);
    if (canvasRefs[rol]?.current?.clearSignature) {
      canvasRefs[rol].current.clearSignature();
      setFirmas({ ...firmas, [key]: null });
    }
  };

  const capitalizar = (text) =>
    text === 'calidad' ? 'A. Calidad DGM' : text.charAt(0).toUpperCase() + text.slice(1);

  return (
    <View style={estilos.contenedorPrincipal}>
      {/* Encabezado fijo */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botonVolver}>
          <Ionicons name="arrow-back" size={24} color="#ff9900" />
        </TouchableOpacity>
        <Text style={estilos.titulo}>{equipo}</Text>
      </View>

      {/* Contenido sin desplazamiento */}
      <View style={estilos.contenedorContenido}>
        {roles.map((rol, i) => (
          <View key={i} style={estilos.bloqueFirma}>
            <Text style={estilos.rolTexto}>{capitalizar(rol)}</Text>

            <View style={estilos.fila}>
              <View style={estilos.cajaFirma}>
                {Platform.OS !== 'web' && (
                  <>
                    <SignatureCanvas
                      ref={canvasRefs[rol]}
                      onOK={(base64) => manejarFirma(base64, rol)}
                      autoClear={false}
                      imageType="image/png"
                      webStyle={`
                        .m-signature-pad--footer {display: none; margin: 0px;}
                        body,html {margin: 0; padding: 0;}
                      `}
                    />
                    <TouchableOpacity
                      onPress={() => limpiarFirma(rol)}
                      style={estilos.botonLimpiar}
                    >
                      <Text style={estilos.textoLimpiar}>Limpiar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={estilos.cajaCarnet}
                onPress={() => seleccionarImagen(rol)}
              >
                {respaldos[getRespaldoKey(rol)] ? (
                  <Image source={{ uri: respaldos[getRespaldoKey(rol)] }} style={estilos.imgRespaldo} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={28} color="#777" />
                    <Text style={estilos.textoCarnet}>Subir carnet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={estilos.botonFinalizar}
          onPress={() =>
            navigation.navigate('InformeResumen', {
              informe,
              respuestas,
              imagenes,
              firmas,
              respaldos,
              mantenimientoId,
            })
          }
        >
          <Text style={estilos.textoBotonFinalizar}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  botonVolver: {
    position: 'absolute',
    left: 20,
    top: 40,
    zIndex: 10,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contenedorContenido: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bloqueFirma: {
    marginBottom: 24,
  },
  rolTexto: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cajaFirma: {
    flex: 1,
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  botonLimpiar: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#ff9900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  textoLimpiar: {
    color: '#fff',
    fontSize: 12,
  },
  cajaCarnet: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgRespaldo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textoCarnet: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
  },
  botonFinalizar: {
    backgroundColor: '#ff9900',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  botonCancelar: {
    backgroundColor: '#eee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  textoBotonFinalizar: {
    color: '#fff',
    fontWeight: '600',
  },
  textoBotonCancelar: {
    color: '#666',
    fontWeight: '600',
  },
});
