import React, { useState, useEffect } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity,
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';

import { auth } from '../servicio/firebase-config';
import { db } from '../servicio/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function PerfilAdmin({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "usuarios", user.uid);
          let docSnap = await getDoc(docRef);

          // Si no existe en "usuarios", intentar con "Usuario"
          if (!docSnap.exists()) {
            const docRefAlt = doc(db, "Usuario", user.uid);
            docSnap = await getDoc(docRefAlt);
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Datos del usuario:", data);
            setUserData(data);
          } else {
            console.log("No se encontró el documento del usuario en Firestore.");
            Alert.alert("Error", "No se encontró la información del perfil.");
          }
        } catch (error) {
          console.error("Error al obtener el perfil del usuario:", error);
          Alert.alert("Error", "Hubo un problema al cargar el perfil.");
        }
      } else {
        Alert.alert("Error", "Usuario no autenticado.");
      }
      setCargando(false);
    }

    fetchUserData();
  }, []);

  const CerrarSesion = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que deseas cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Cerrar Sesión",
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.reset({
                index: 0,
                routes: [{ name: 'InicioSesion' }], 
              });
            } catch (error) {
              console.error("Error al cerrar sesión:", error);
              Alert.alert("Error", "No se pudo cerrar la sesión. Intenta nuevamente.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  if (cargando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 10, color: COLORES.texto }}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={estilosComunes.encabezado}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
          </TouchableOpacity>
          <Text style={[estilosComunes.titulo, { margin: 0 }]}>Mi Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        >
          {/* Header de perfil */}
          <View style={{
            backgroundColor: COLORES.primario,
            padding: 20,
            borderRadius: 12,
            marginBottom: 24,
            alignItems: 'center',
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="shield-checkmark" size={40} color={COLORES.primario} />
            </View>
            <Text style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              {userData?.nombre || userData?.Nombre || 'Usuario'}
            </Text>
            <Text style={{
              color: '#fff',
              fontSize: 14,
              marginTop: 4,
              opacity: 0.9,
            }}>
              Administrador
            </Text>
          </View>

          {/* Sección de información */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}>
            {/* Nombre */}
            <View style={{ marginBottom: 16 }}>
              <Text style={estilosComunes.etiqueta}>Nombre Completo</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="person-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, color: COLORES.texto }}>
                  {userData?.nombre || userData?.Nombre || 'No disponible'}
                </Text>
              </View>
            </View>

            {/* Correo */}
            <View style={{ marginBottom: 16 }}>
              <Text style={estilosComunes.etiqueta}>Correo Electrónico</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="mail-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, color: COLORES.texto }}>
                  {userData?.correo || userData?.email || userData?.Correo || auth.currentUser?.email || 'No disponible'}
                </Text>
              </View>
            </View>

            {/* Contraseña */}
            <View style={{ marginBottom: 16 }}>
              <Text style={estilosComunes.etiqueta}>Contraseña</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, color: COLORES.texto }}>
                  ••••••••
                </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('CambioContrasena')}
                  style={{
                    backgroundColor: COLORES.primario,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                    Cambiar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RUT */}
            <View>
              <Text style={estilosComunes.etiqueta}>RUT</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: '#e0e0e0',
              }}>
                <Ionicons name="card-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 15, color: COLORES.texto }}>
                  {userData?.rut || userData?.Rut || 'No disponible'}
                </Text>
              </View>
            </View>
          </View>

          {/* Información adicional de privilegios */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORES.primario} />
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORES.texto,
                marginLeft: 8,
              }}>
                Privilegios de Administrador
              </Text>
            </View>
            <Text style={{
              fontSize: 13,
              color: '#666',
              lineHeight: 20,
            }}>
              Tienes acceso completo al sistema de gestión de mantenimiento. Puedes gestionar trabajadores y equipos
            </Text>
          </View>
        </ScrollView>

        {/* Botón de cerrar sesión */}
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
              backgroundColor: '#dc3545',
              padding: 15,
              borderRadius: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 2,
            }}
            onPress={CerrarSesion}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}