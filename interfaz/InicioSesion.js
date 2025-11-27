import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import estilos, { COLORES } from '../assets/estilos';
import { auth, db } from '../servicio/firebase-config';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function InicioSesion({ navigation }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(true);
  const [iniciandoSesion, setIniciandoSesion] = useState(false);

  const estanCamposVacios = usuario.trim() === '' || contrasena === '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'Usuario', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const rol = userData.rol;
            const habilitado = userData.habilitado;

            // Verificar si el usuario está habilitado
            if (habilitado === false) {
              await signOut(auth);
              Alert.alert(
                'Cuenta deshabilitada',
                'Su cuenta ha sido deshabilitada. Contacte al administrador para más información.'
              );
              setCargando(false);
              return;
            }

            switch (rol) {
              case 'admin':
                navigation.replace('InicioAdmin');
                break;
              case 'mantenedor':
                navigation.replace('InicioMantenedor', { usuario: userData.nombre });
                break;
              default:
                console.log("El rol del usuario no es 'admin' o 'mantenedor'.");
                await signOut(auth);
                Alert.alert(
                  'Error de acceso',
                  'Su perfil no tiene un rol válido. Contacte al administrador.'
                );
            }
          } else {
            console.log('Documento del usuario no encontrado en Firestore.');
            await signOut(auth);
            Alert.alert('Error', 'No se encontró la información de su perfil.');
          }
        } catch (error) {
          console.error('Error al obtener el rol del usuario:', error);
          Alert.alert('Error', 'Hubo un problema al obtener la información de su perfil.');
        }
      }
      setCargando(false);
    });

    return unsubscribe;
  }, []);

  const manejarInicioSesion = async () => {
    if (estanCamposVacios) return;

    setIniciandoSesion(true);

    try {
      // Primero intentamos iniciar sesión
      const userCredential = await signInWithEmailAndPassword(
        auth,
        usuario.trim().toLowerCase(),
        contrasena
      );

      // Verificar si el usuario está habilitado ANTES de permitir el acceso
      const userDocRef = doc(db, 'Usuario', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.habilitado === false) {
          // Si no está habilitado, cerrar sesión inmediatamente
          await signOut(auth);
          Alert.alert(
            'Cuenta deshabilitada',
            'Su cuenta ha sido deshabilitada. Contacte al administrador para más información.'
          );
          setIniciandoSesion(false);
          return;
        }
        // Si está habilitado, el onAuthStateChanged se encargará de la navegación
      } else {
        await signOut(auth);
        Alert.alert('Error', 'No se encontró la información de su perfil.');
      }
    } catch (error) {
      console.log('Error de inicio de sesión:', error.code);

      let mensajeError = 'Hubo un problema al iniciar sesión';

      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          mensajeError = 'Correo o contraseña incorrectos';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El formato del correo no es válido';
          break;
        case 'auth/too-many-requests':
          mensajeError = 'Demasiados intentos fallidos. Intente más tarde';
          break;
        case 'auth/network-request-failed':
          mensajeError = 'Error de conexión. Verifique su internet';
          break;
      }

      Alert.alert('Error', mensajeError);
    } finally {
      setIniciandoSesion(false);
    }
  };

  if (cargando) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/3/30/SGS_SA_logo.svg' }}
        style={estilos.logo}
        resizeMode="contain"
      />

      <Text style={estilos.titulo}>SIMO</Text>

      <Text style={estilos.etiqueta}>Correo</Text>
      <TextInput
        style={estilos.entrada}
        placeholder="nombre.apellido@ejemplo.com"
        placeholderTextColor="#999"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!iniciandoSesion}
      />

      <Text style={estilos.etiqueta}>Contraseña</Text>
      <TextInput
        style={estilos.entrada}
        placeholder="Tu contraseña"
        placeholderTextColor="#999"
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
        editable={!iniciandoSesion}
      />

      <TouchableOpacity
        style={[
          estilos.boton,
          (estanCamposVacios || iniciandoSesion) && { opacity: 0.6 }
        ]}
        onPress={manejarInicioSesion}
        disabled={estanCamposVacios || iniciandoSesion}
      >
        {iniciandoSesion ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.textoBoton}>Iniciar sesión</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('OlvideContrasena')}
        disabled={iniciandoSesion}
      >
        <Text style={estilos.olvido}>¿Olvidaste la contraseña?</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}