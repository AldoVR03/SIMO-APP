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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function PerfilMantenedor({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, "usuarios", user.uid);
          let docSnap = await getDoc(docRef);

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

  // Callback cuando se completa la verificación
  const handleVerificacionCompleta = async (datosVerificacion) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "Usuario", user.uid);
        
        // Actualizar datos de verificación en Firebase
        await updateDoc(docRef, {
          verificacion: {
            estado: 'verificado',
            fechaVerificacion: new Date(),
            // IMPORTANTE: Ahora guardamos datos reales, no simulados
            metodo: 'local_option_b', // Para trazabilidad en el informe
            consistenciaFirma: datosVerificacion.datosVerificacion.consistencia,
            datosManuales: datosVerificacion.datosExtraidos // RUT y Nombre validados visualmente
          }
        });

        // Actualizar estado local
        setUserData(prev => ({
          ...prev,
          verificacion: {
            estado: 'verificado',
            fechaVerificacion: new Date(),
            umbralSimilitud: datosVerificacion.datosVerificacion.umbral,
          }
        }));
        
        console.log('✅ Verificación guardada correctamente');
      }
    } catch (error) {
      console.error("Error al guardar verificación:", error);
      Alert.alert('Error', 'No se pudo guardar la verificación. Intenta nuevamente.');
    }
  };

  const navegarVerificacion = () => {
    navigation.navigate('VerificacionIdentidad', {
      userData,
      onVerificacionCompleta: handleVerificacionCompleta,
    });
  };

  const CerrarSesion = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
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

  // Determinar estado de verificación
  const estadoVerificacion = userData?.verificacion?.estado || 'pendiente';
  const estaVerificado = estadoVerificacion === 'verificado';

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
          {/* Header del perfil */}
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
              <Ionicons name="person" size={40} color={COLORES.primario} />
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
              Mantenedor
            </Text>

            {/* Badge de verificación */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: estaVerificado ? 'rgba(40, 167, 69, 0.2)' : 'rgba(255, 193, 7, 0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginTop: 12,
            }}>
              <Ionicons 
                name={estaVerificado ? "shield-checkmark" : "warning"} 
                size={16} 
                color={estaVerificado ? "#90EE90" : "#FFD700"} 
              />
              <Text style={{
                color: estaVerificado ? "#90EE90" : "#FFD700",
                fontSize: 12,
                fontWeight: '600',
                marginLeft: 6,
              }}>
                {estaVerificado ? "Identidad Verificada" : "Verificación Pendiente"}
              </Text>
            </View>
          </View>

          {/* NUEVA SECCIÓN: Verificación de Identidad */}
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
            borderWidth: estaVerificado ? 1 : 2,
            borderColor: estaVerificado ? '#e0e0e0' : COLORES.primario,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Ionicons 
                name="finger-print" 
                size={24} 
                color={COLORES.primario} 
                style={{ marginRight: 10 }} 
              />
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: COLORES.texto,
              }}>
                Verificación de Identidad
              </Text>
            </View>

            {estaVerificado ? (
              // Estado: Verificado
              <View>
                <View style={{
                  backgroundColor: '#d4edda',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                    <Text style={{ color: '#155724', fontWeight: '600', marginLeft: 8 }}>
                      Tu identidad está verificada
                    </Text>
                  </View>
                  <Text style={{ color: '#155724', fontSize: 12, marginTop: 6 }}>
                    Umbral de similitud: {userData?.verificacion?.umbralSimilitud || 72}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                  }}
                  onPress={navegarVerificacion}
                >
                  <Ionicons name="refresh" size={18} color={COLORES.primario} />
                  <Text style={{ color: COLORES.primario, marginLeft: 6, fontSize: 14 }}>
                    Volver a verificar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Estado: Pendiente
              <View>
                <Text style={{
                  fontSize: 14,
                  color: '#666',
                  marginBottom: 16,
                  lineHeight: 20,
                }}>
                  Para firmar informes correctivos y preventivos, debes verificar tu identidad subiendo tu carnet y calibrando tu firma.
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: COLORES.primario,
                    padding: 14,
                    borderRadius: 8,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={navegarVerificacion}
                >
                  <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                    Verificar Ahora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Sección de información personal */}
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
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Información Personal
            </Text>

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
        </ScrollView>

        {/* Botón Cerrar Sesión */}
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