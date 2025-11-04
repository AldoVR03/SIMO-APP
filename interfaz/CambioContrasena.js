import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';
import { auth } from '../servicio/firebase-config';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function CambioContrasena({ navigation }) {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [contrasenaConfirmar, setContrasenaConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const validarFormulario = () => {
    if (!contrasenaActual.trim()) {
      Alert.alert('Error', 'Ingresa tu contraseña actual');
      return false;
    }

    if (!contrasenaNueva.trim()) {
      Alert.alert('Error', 'Ingresa una nueva contraseña');
      return false;
    }

    if (contrasenaNueva.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (contrasenaNueva !== contrasenaConfirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    if (contrasenaActual === contrasenaNueva) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return false;
    }

    return true;
  };

  const cambiarContrasena = async () => {
    if (!validarFormulario()) return;

    try {
      setCargando(true);
      const user = auth.currentUser;

      if (!user || !user.email) {
        Alert.alert('Error', 'No se pudo obtener el usuario autenticado');
        return;
      }

      // Reautenticar al usuario con su contraseña actual
      const credential = EmailAuthProvider.credential(
        user.email,
        contrasenaActual
      );

      await reauthenticateWithCredential(user, credential);

      // Cambiar la contraseña
      await updatePassword(user, contrasenaNueva);

      Alert.alert(
        'Éxito',
        'Tu contraseña ha sido actualizada correctamente',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

      // Limpiar campos
      setContrasenaActual('');
      setContrasenaNueva('');
      setContrasenaConfirmar('');

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      
      let mensajeError = 'Hubo un problema al cambiar la contraseña';
      
      if (error.code === 'auth/wrong-password') {
        mensajeError = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es muy débil';
      } else if (error.code === 'auth/requires-recent-login') {
        mensajeError = 'Por seguridad, debes cerrar sesión y volver a iniciarla antes de cambiar la contraseña';
      }

      Alert.alert('Error', mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
          </TouchableOpacity>
          <Text style={[estilosComunes.titulo, { margin: 0 }]}>Cambiar Contraseña</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        >
          {/* Card de información */}
          <View style={{
            backgroundColor: '#fff5e6',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: COLORES.primario,
          }}>
            <Ionicons name="information-circle" size={24} color={COLORES.primario} style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, fontSize: 13, color: '#666', lineHeight: 18 }}>
              Por seguridad, necesitas ingresar tu contraseña actual antes de cambiarla.
            </Text>
          </View>

          {/* Formulario */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}>
            {/* Contraseña actual */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[estilosComunes.etiqueta, { marginBottom: 8 }]}>
                Contraseña Actual
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: contrasenaActual ? COLORES.primario : '#e0e0e0',
              }}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Ingresa tu contraseña actual"
                  secureTextEntry={!mostrarActual}
                  value={contrasenaActual}
                  onChangeText={setContrasenaActual}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarActual(!mostrarActual)}>
                  <Ionicons 
                    name={mostrarActual ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nueva contraseña */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[estilosComunes.etiqueta, { marginBottom: 8 }]}>
                Nueva Contraseña
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: contrasenaNueva ? COLORES.primario : '#e0e0e0',
              }}>
                <Ionicons name="key-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!mostrarNueva}
                  value={contrasenaNueva}
                  onChangeText={setContrasenaNueva}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarNueva(!mostrarNueva)}>
                  <Ionicons 
                    name={mostrarNueva ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {contrasenaNueva.length > 0 && contrasenaNueva.length < 6 && (
                <Text style={{ fontSize: 12, color: '#e74c3c', marginTop: 4 }}>
                  La contraseña debe tener al menos 6 caracteres
                </Text>
              )}
            </View>

            {/* Confirmar contraseña */}
            <View style={{ marginBottom: 8 }}>
              <Text style={[estilosComunes.etiqueta, { marginBottom: 8 }]}>
                Confirmar Nueva Contraseña
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: contrasenaConfirmar ? 
                  (contrasenaNueva === contrasenaConfirmar ? '#27ae60' : '#e74c3c') 
                  : '#e0e0e0',
              }}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Confirma tu nueva contraseña"
                  secureTextEntry={!mostrarConfirmar}
                  value={contrasenaConfirmar}
                  onChangeText={setContrasenaConfirmar}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarConfirmar(!mostrarConfirmar)}>
                  <Ionicons 
                    name={mostrarConfirmar ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              {contrasenaConfirmar.length > 0 && contrasenaNueva !== contrasenaConfirmar && (
                <Text style={{ fontSize: 12, color: '#e74c3c', marginTop: 4 }}>
                  Las contraseñas no coinciden
                </Text>
              )}
              {contrasenaConfirmar.length > 0 && contrasenaNueva === contrasenaConfirmar && (
                <Text style={{ fontSize: 12, color: '#27ae60', marginTop: 4 }}>
                  ✓ Las contraseñas coinciden
                </Text>
              )}
            </View>
          </View>

          {/* Requisitos de seguridad */}
          <View style={{
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORES.texto, marginBottom: 8 }}>
              Requisitos de seguridad:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons 
                name={contrasenaNueva.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={contrasenaNueva.length >= 6 ? '#27ae60' : '#999'} 
              />
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                Mínimo 6 caracteres
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons 
                name={contrasenaNueva !== contrasenaActual && contrasenaNueva.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={contrasenaNueva !== contrasenaActual && contrasenaNueva.length > 0 ? '#27ae60' : '#999'} 
              />
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                Diferente a la contraseña actual
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={contrasenaNueva === contrasenaConfirmar && contrasenaNueva.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={contrasenaNueva === contrasenaConfirmar && contrasenaNueva.length > 0 ? '#27ae60' : '#999'} 
              />
              <Text style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                Las contraseñas coinciden
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Botones (fijos abajo) */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 24,
          paddingBottom: 30,
          backgroundColor: COLORES.fondo,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: COLORES.primario,
              padding: 15,
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 2,
              opacity: cargando ? 0.6 : 1,
            }}
            onPress={cambiarContrasena}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                  Cambiar Contraseña
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              padding: 12,
              alignItems: 'center',
              marginTop: 12,
            }}
            onPress={() => navigation.goBack()}
            disabled={cargando}
          >
            <Text style={{ color: '#666', fontSize: 14 }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}