import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';
import { auth } from '../servicio/firebase-config';
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';

export default function CambioContrasena({ navigation }) {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [contrasenaConfirmar, setContrasenaConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  
  // Estados para mostrar/ocultar contraseñas
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const validarContrasena = (password) => {
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  };

  const handleCambiarContrasena = async () => {
    // Validaciones
    if (!contrasenaActual || !contrasenaNueva || !contrasenaConfirmar) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const errorValidacion = validarContrasena(contrasenaNueva);
    if (errorValidacion) {
      Alert.alert('Error', errorValidacion);
      return;
    }

    if (contrasenaNueva !== contrasenaConfirmar) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }

    if (contrasenaActual === contrasenaNueva) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setCargando(true);

    try {
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
        setCargando(false);
        return;
      }

      // Reautenticar al usuario con la contraseña actual
      const credential = EmailAuthProvider.credential(
        user.email,
        contrasenaActual
      );

      await reauthenticateWithCredential(user, credential);

      // Cambiar la contraseña
      await updatePassword(user, contrasenaNueva);

      Alert.alert(
        'Éxito',
        'Tu contraseña ha sido cambiada correctamente',
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
      
      let mensajeError = 'No se pudo cambiar la contraseña. Intenta nuevamente.';
      
      if (error.code === 'auth/wrong-password') {
        mensajeError = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es muy débil';
      } else if (error.code === 'auth/requires-recent-login') {
        mensajeError = 'Por seguridad, necesitas cerrar sesión y volver a iniciar sesión antes de cambiar tu contraseña';
      }
      
      Alert.alert('Error', mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Información de seguridad */}
          <View style={{
            backgroundColor: '#e3f2fd',
            borderLeftWidth: 4,
            borderLeftColor: '#2196F3',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="information-circle" size={24} color="#2196F3" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  color: '#1565C0',
                  lineHeight: 20,
                }}>
                  Por seguridad, necesitas ingresar tu contraseña actual antes de establecer una nueva.
                </Text>
              </View>
            </View>
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
              <Text style={estilosComunes.etiqueta}>Contraseña Actual</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Ingresa tu contraseña actual"
                  placeholderTextColor="#999"
                  secureTextEntry={!mostrarActual}
                  value={contrasenaActual}
                  onChangeText={setContrasenaActual}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarActual(!mostrarActual)}>
                  <Ionicons 
                    name={mostrarActual ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nueva contraseña */}
            <View style={{ marginBottom: 20 }}>
              <Text style={estilosComunes.etiqueta}>Nueva Contraseña</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor="#999"
                  secureTextEntry={!mostrarNueva}
                  value={contrasenaNueva}
                  onChangeText={setContrasenaNueva}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarNueva(!mostrarNueva)}>
                  <Ionicons 
                    name={mostrarNueva ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
              <Text style={{
                fontSize: 12,
                color: '#666',
                marginTop: 6,
                marginLeft: 4,
              }}>
                Mínimo 6 caracteres
              </Text>
            </View>

            {/* Confirmar contraseña */}
            <View style={{ marginBottom: 8 }}>
              <Text style={estilosComunes.etiqueta}>Confirmar Nueva Contraseña</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    fontSize: 15,
                    color: COLORES.texto,
                  }}
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor="#999"
                  secureTextEntry={!mostrarConfirmar}
                  value={contrasenaConfirmar}
                  onChangeText={setContrasenaConfirmar}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarConfirmar(!mostrarConfirmar)}>
                  <Ionicons 
                    name={mostrarConfirmar ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Botón de cambiar contraseña */}
          <TouchableOpacity
            style={{
              backgroundColor: COLORES.primario,
              padding: 16,
              borderRadius: 8,
              marginTop: 24,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 2,
              opacity: cargando ? 0.7 : 1,
            }}
            onPress={handleCambiarContrasena}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                  Cambiar Contraseña
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}