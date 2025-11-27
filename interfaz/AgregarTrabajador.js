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
import { db, secondaryAuth } from '../servicio/firebase-config';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function AgregarTrabajador({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const validarRut = (rut) => {
    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
    if (rutLimpio.length < 8) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    if (!/^\d+$/.test(cuerpo)) return false;

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const dvEsperado = 11 - (suma % 11);
    const dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();

    return dv === dvFinal;
  };

  const formatearRut = (texto) => {
    const limpio = texto.replace(/[^0-9kK]/g, '');
    if (limpio.length === 0) return '';

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);

    let cuerpoFormateado = '';
    let contador = 0;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      if (contador === 3) {
        cuerpoFormateado = '.' + cuerpoFormateado;
        contador = 0;
      }
      cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
      contador++;
    }

    return cuerpoFormateado + (dv ? '-' + dv.toUpperCase() : '');
  };

  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const generarContrasenaAleatoria = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    setContrasena(password);
  };

  const limpiarFormulario = () => {
    setNombre('');
    setRut('');
    setCorreo('');
    setContrasena('');
  };

  const handleAgregarTrabajador = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del trabajador');
      return;
    }

    if (!rut.trim()) {
      Alert.alert('Error', 'Por favor ingresa el RUT');
      return;
    }

    if (!validarRut(rut)) {
      Alert.alert('Error', 'El RUT ingresado no es válido');
      return;
    }

    if (!correo.trim()) {
      Alert.alert('Error', 'Por favor ingresa el correo electrónico');
      return;
    }

    if (!validarEmail(correo)) {
      Alert.alert('Error', 'El correo electrónico no es válido');
      return;
    }

    if (!contrasena.trim()) {
      Alert.alert('Error', 'Por favor ingresa o genera una contraseña');
      return;
    }

    if (contrasena.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCargando(true);

    try {
      // Crear usuario usando la instancia secundaria de Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        correo.trim().toLowerCase(),
        contrasena
      );

      const nuevoUsuarioId = userCredential.user.uid;

      // Guardar datos en Firestore (colección "Usuario" con mayúscula)
      await setDoc(doc(db, 'Usuario', nuevoUsuarioId), {
        nombre: nombre.trim(),
        rut: rut.trim(),
        correo: correo.trim().toLowerCase(),
        rol: 'mantenedor',
        habilitado: true,
        primerIngreso: true,
        fechaCreacion: new Date().toISOString(),
      });

      // Cerrar sesión del auth secundario (no afecta al admin)
      await signOut(secondaryAuth);

      console.log('✅ Trabajador creado:', nuevoUsuarioId);

      Alert.alert(
        '✅ Trabajador Creado',
        `${nombre} ha sido registrado exitosamente.\n\n` +
        `📧 Correo: ${correo}\n` +
        `🔐 Contraseña: ${contrasena}\n\n` +
        `Guarda estas credenciales para compartirlas con el trabajador.`,
        [
          {
            text: 'Agregar Otro',
            onPress: limpiarFormulario,
          },
          {
            text: 'Volver',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );

    } catch (error) {
      console.error('❌ Error al agregar trabajador:', error);

      let mensajeError = 'No se pudo agregar el trabajador. Intenta nuevamente.';

      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'Este correo electrónico ya está registrado';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El correo electrónico no es válido';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es muy débil';
      } else if (error.code === 'auth/network-request-failed') {
        mensajeError = 'Error de conexión. Verifica tu internet';
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
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
          </TouchableOpacity>
          <Text style={[estilosComunes.titulo, { margin: 0 }]}>Agregar Trabajador</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
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
            {/* Nombre */}
            <View style={{ marginBottom: 20 }}>
              <Text style={estilosComunes.etiqueta}>Nombre Completo *</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: COLORES.texto }}
                  placeholder="Ej: Juan Pérez González"
                  placeholderTextColor="#999"
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* RUT */}
            <View style={{ marginBottom: 20 }}>
              <Text style={estilosComunes.etiqueta}>RUT *</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="card-outline" size={20} color="#666" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: COLORES.texto }}
                  placeholder="Ej: 12.345.678-9"
                  placeholderTextColor="#999"
                  value={rut}
                  onChangeText={(texto) => setRut(formatearRut(texto))}
                  keyboardType="default"
                  autoCapitalize="characters"
                  maxLength={12}
                />
              </View>
            </View>

            {/* Correo */}
            <View style={{ marginBottom: 20 }}>
              <Text style={estilosComunes.etiqueta}>Correo Electrónico *</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORES.fondo,
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: COLORES.texto }}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#999"
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={{ marginBottom: 8 }}>
              <Text style={estilosComunes.etiqueta}>Contraseña Temporal *</Text>
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
                  style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, color: COLORES.texto }}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#999"
                  secureTextEntry={!mostrarContrasena}
                  value={contrasena}
                  onChangeText={setContrasena}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setMostrarContrasena(!mostrarContrasena)}>
                  <Ionicons name={mostrarContrasena ? "eye-outline" : "eye-off-outline"} size={22} color="#666" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={generarContrasenaAleatoria} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="refresh-outline" size={16} color={COLORES.primario} />
                <Text style={{ fontSize: 13, color: COLORES.primario, marginLeft: 6, fontWeight: '600' }}>
                  Generar contraseña automática
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
            onPress={handleAgregarTrabajador}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  Agregar Trabajador
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}