import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function InicioSupervisor({ navigation, route }) {
    const { usuario } = route.params || {};
    const [informesPendientes, setInformesPendientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        setCargando(true);

        const qPreventivos = query(
            collection(db, 'informePreventivo'),
            where('estado', '==', 'Faltante de firmas')
        );

        const unsubscribePreventivos = onSnapshot(qPreventivos, (snapshot) => {
            const informes = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    tipo: 'Preventivo',
                    ...doc.data()
                }))
                .filter(informe => {
                    const firmas = informe.firmas || {};
                    return firmas.firma_mantenedor && !firmas.firma_supervisor;
                });

            setInformesPendientes(informes);
            setCargando(false);
        }, (error) => {
            console.error('Error cargando informes:', error);
            setCargando(false);
        });

        return () => unsubscribePreventivos();
    }, []);

    const cerrarSesion = () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro que deseas cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar Sesión',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            navigation.replace('InicioSesion');
                        } catch (error) {
                            console.error('Error al cerrar sesión:', error);
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin fecha';
        if (fecha.toDate) {
            return fecha.toDate().toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        return new Date(fecha).toLocaleDateString('es-CL');
    };

    if (cargando) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORES.primario} />
                    <Text style={{ marginTop: 10, color: '#666' }}>Cargando informes...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
            {/* Header */}
            <View style={{
                backgroundColor: COLORES.primario,
                paddingTop: 20,
                paddingBottom: 30,
                paddingHorizontal: 20,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#fff', fontSize: 14, opacity: 0.9 }}>Bienvenido,</Text>
                        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>
                            {usuario || 'Supervisor'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PerfilSupervisor')}
                            style={{
                                width: 45,
                                height: 45,
                                borderRadius: 22,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 10,
                            }}
                        >
                            <Ionicons name="person" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={cerrarSesion}
                            style={{
                                width: 45,
                                height: 45,
                                borderRadius: 22,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 20,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: 12,
                    borderRadius: 12,
                }}>
                    <Ionicons name="shield-checkmark" size={24} color="#fff" />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 12, opacity: 0.9 }}>Rol</Text>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Supervisor</Text>
                    </View>
                </View>
            </View>

            {/* Contador */}
            <View style={{
                marginTop: -20,
                marginHorizontal: 20,
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            }}>
                <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: informesPendientes.length > 0 ? '#fff3cd' : '#d4edda',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: informesPendientes.length > 0 ? '#856404' : '#155724',
                    }}>
                        {informesPendientes.length}
                    </Text>
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORES.texto }}>
                        Informes Pendientes
                    </Text>
                    <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        {informesPendientes.length > 0
                            ? 'Esperando tu firma'
                            : 'No hay informes pendientes'}
                    </Text>
                </View>
            </View>

            {/* Lista */}
            <View style={{ flex: 1, marginTop: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORES.texto }}>
                        Informes para Firmar
                    </Text>
                    <TouchableOpacity onPress={onRefresh}>
                        <Ionicons name="refresh" size={22} color={COLORES.primario} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORES.primario]} />
                    }
                >
                    {informesPendientes.length === 0 ? (
                        <View style={{
                            backgroundColor: '#fff',
                            borderRadius: 12,
                            padding: 40,
                            alignItems: 'center',
                        }}>
                            <Ionicons name="checkmark-done-circle" size={60} color="#27ae60" />
                            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORES.texto, marginTop: 16 }}>
                                ¡Todo al día!
                            </Text>
                            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 }}>
                                No hay informes pendientes de tu firma
                            </Text>
                        </View>
                    ) : (
                        informesPendientes.map((informe) => (
                            <TouchableOpacity
                                key={informe.id}
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 12,
                                    borderLeftWidth: 4,
                                    borderLeftColor: COLORES.primario,
                                    elevation: 2,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                }}
                                onPress={() => navigation.navigate('FirmarInforme', {
                                    informe,
                                    tipoFirma: 'supervisor'
                                })}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <View style={{
                                                backgroundColor: COLORES.primario,
                                                paddingHorizontal: 8,
                                                paddingVertical: 3,
                                                borderRadius: 8,
                                                marginRight: 8,
                                            }}>
                                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                                                    {informe.tipo}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 11, color: '#999' }}>
                                                {formatearFecha(informe.fecha)}
                                            </Text>
                                        </View>

                                        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORES.texto, marginBottom: 4 }}>
                                            {informe.equipo || 'Equipo sin nombre'}
                                        </Text>

                                        <Text style={{ fontSize: 12, color: '#666' }}>
                                            Código: {informe.codigo_sgs || 'N/A'}
                                        </Text>

                                        {informe.usuario && (
                                            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                                👤 {informe.usuario}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={{
                                        backgroundColor: COLORES.primario,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                        <Ionicons name="create" size={16} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                                            Firmar
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}