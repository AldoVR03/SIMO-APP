import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import estilos from '../assets/estilos';
import { auth } from '../servicio/firebase-config';
import { db } from '../servicio/firebase-config';

import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'; 
import { doc, getDoc } from 'firebase/firestore'; 


export default function InicioSesion({ navigation }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(true);
  const estanCamposVacios = usuario === "" || contrasena === "";
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'Usuario', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const rol = userData.rol;

            switch (rol) {
              case 'admin':
                navigation.replace('InicioAdmin');
                break;
              case 'mantenedor':
                navigation.replace('InicioMantenedor' , { usuario });
                break;
              default:
                console.log("El rol del usuario no es 'admin' o 'mantenedor'.");
                Alert.alert('Error de acceso', 'Su perfil no tiene un rol válido. Contacte al administrador.');
            }
          } else {
            console.log("Documento del usuario no encontrado en Firestore.");
            Alert.alert('Error', 'No se encontró la información de su perfil.');
          }
        } catch (error) {
          console.error("Error al obtener el rol del usuario:", error);
          Alert.alert('Error', 'Hubo un problema al obtener la información de su perfil.');
        }
      }
      setCargando(false);
    });

    return unsubscribe;
  }, []);

  const manejarInicioSesion = async () => {
    try {
      await signInWithEmailAndPassword(auth, usuario, contrasena);
    } catch (error) {
      console.log(error);
      if (error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
      } else {
        Alert.alert('Error', 'Hubo un problema al iniciar sesión');
      }
    }
  };

  if (cargando) {
    return (
      <View style={[estilos.contenedor, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Cargando...</Text>
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
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />

      <Text style={estilos.etiqueta}>Contraseña</Text>
      <TextInput
        style={estilos.entrada}
        placeholder="Tu contraseña"
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />

      <TouchableOpacity style={estilos.boton} onPress={manejarInicioSesion} disabled={estanCamposVacios} >
        <Text style={estilos.textoBoton}>Iniciar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('OlvideContrasena')}>
        <Text style={estilos.olvido}>¿Olvidaste la contraseña?</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}