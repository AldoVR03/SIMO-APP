import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function VerInformePendiente({ route, navigation }) {
    const { informe, tipoFirma } = route.params;

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

    const obtenerColorRespuesta = (respuesta) => {
        switch (respuesta) {
            case 'Sí':
            case 'Si':
                return '#27ae60';
            case 'No':
                return '#e74c3c';
            case 'No aplica':
                return '#95a5a6';
            default:
                return '#000';
        }
    };

    const obtenerTituloRol = () => {
        switch (tipoFirma) {
            case 'supervisor':
                return { titulo: 'Supervisor', color: '#9b59b6' };
            case 'calidad':
                return { titulo: 'Control de Calidad', color: '#e67e22' };
            default:
                return { titulo: 'Firma', color: COLORES.primario };
        }
    };

    const rolInfo = obtenerTituloRol();

    // Obtener respuestas
    let respuestasArray = [];
    if (informe.respuestas) {
        if (Array.isArray(informe.respuestas)) {
            respuestasArray = informe.respuestas;
        } else {
            respuestasArray = Object.values(informe.respuestas).filter(r => r && r.pregunta);
        }
    }

    const imagenes = informe.imagenes || informe.evidencias || [];

    // Firmas existentes
    const firmas = informe.firmas || {};
    const nombres = informe.nombres || {};

    const irAFirmar = () => {
        navigation.navigate('FirmarInforme', {
            informe,
            tipoFirma,
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
            {/* Header */}
            <View style={{
                backgroundColor: rolInfo.color,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Revisión de Informe</Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                        {informe.equipo || 'Equipo sin nombre'}
                    </Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                {/* Info del equipo */}
                <View style={styles.seccion}>
                    <Text style={styles.tituloSeccion}>Información General</Text>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Equipo:</Text>
                        <Text style={styles.valor}>{informe.equipo || 'N/A'}</Text>
                    </View>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Código SGS:</Text>
                        <Text style={styles.valor}>{informe.codigo_sgs || 'N/A'}</Text>
                    </View>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Fecha:</Text>
                        <Text style={styles.valor}>{formatearFecha(informe.fecha)}</Text>
                    </View>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Marca:</Text>
                        <Text style={styles.valor}>{informe.marca || 'N/A'}</Text>
                    </View>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Modelo:</Text>
                        <Text style={styles.valor}>{informe.modelo || 'N/A'}</Text>
                    </View>

                    <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Mantenedor:</Text>
                        <Text style={styles.valor}>{informe.usuario || 'N/A'}</Text>
                    </View>
                </View>

                {/* Respuestas de la pauta */}
                {respuestasArray.length > 0 && (
                    <View style={styles.seccion}>
                        <Text style={styles.tituloSeccion}>
                            Pauta de Mantención ({respuestasArray.length} ítems)
                        </Text>

                        {respuestasArray.map((item, index) => (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 8,
                                    borderLeftWidth: 3,
                                    borderLeftColor: obtenerColorRespuesta(item.respuesta),
                                }}
                            >
                                <Text style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
                                    Ítem {index + 1}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>
                                    {item.pregunta}
                                </Text>
                                <View style={{
                                    alignSelf: 'flex-start',
                                    backgroundColor: obtenerColorRespuesta(item.respuesta),
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                                        {item.respuesta}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Evidencias */}
                {imagenes.length > 0 && (
                    <View style={styles.seccion}>
                        <Text style={styles.tituloSeccion}>
                            Evidencias Fotográficas ({imagenes.length})
                        </Text>

                        {imagenes.map((url, index) => (
                            <View
                                key={index}
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <Text style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                                    Evidencia {index + 1}
                                </Text>
                                <Image
                                    source={{ uri: url }}
                                    style={{ width: '100%', height: 200, borderRadius: 8 }}
                                    resizeMode="cover"
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Firmas existentes */}
                <View style={styles.seccion}>
                    <Text style={styles.tituloSeccion}>Estado de Firmas</Text>

                    {/* Firma Mantenedor */}
                    <View style={styles.firmaItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons
                                name={firmas.firma_mantenedor ? 'checkmark-circle' : 'close-circle'}
                                size={20}
                                color={firmas.firma_mantenedor ? '#27ae60' : '#e74c3c'}
                            />
                            <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORES.texto }}>
                                Mantenedor
                            </Text>
                            {nombres.nombre_mantenedor && (
                                <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
                                    ({nombres.nombre_mantenedor})
                                </Text>
                            )}
                        </View>
                        {firmas.firma_mantenedor && (
                            <Image
                                source={{ uri: firmas.firma_mantenedor }}
                                style={{ width: '100%', height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }}
                                resizeMode="contain"
                            />
                        )}
                    </View>

                    {/* Firma Supervisor */}
                    <View style={styles.firmaItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons
                                name={firmas.firma_supervisor ? 'checkmark-circle' : (tipoFirma === 'supervisor' ? 'time' : 'close-circle')}
                                size={20}
                                color={firmas.firma_supervisor ? '#27ae60' : (tipoFirma === 'supervisor' ? '#f39c12' : '#ccc')}
                            />
                            <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORES.texto }}>
                                Supervisor
                            </Text>
                            {tipoFirma === 'supervisor' && !firmas.firma_supervisor && (
                                <View style={{
                                    marginLeft: 8,
                                    backgroundColor: '#fff3cd',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                }}>
                                    <Text style={{ color: '#856404', fontSize: 10, fontWeight: 'bold' }}>PENDIENTE</Text>
                                </View>
                            )}
                        </View>
                        {firmas.firma_supervisor && (
                            <Image
                                source={{ uri: firmas.firma_supervisor }}
                                style={{ width: '100%', height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }}
                                resizeMode="contain"
                            />
                        )}
                    </View>

                    {/* Firma Calidad */}
                    <View style={[styles.firmaItem, { marginBottom: 0 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons
                                name={firmas.firma_a_calidad_dgm ? 'checkmark-circle' : (tipoFirma === 'calidad' ? 'time' : 'close-circle')}
                                size={20}
                                color={firmas.firma_a_calidad_dgm ? '#27ae60' : (tipoFirma === 'calidad' ? '#f39c12' : '#ccc')}
                            />
                            <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORES.texto }}>
                                Control de Calidad Codelco
                            </Text>
                            {tipoFirma === 'calidad' && !firmas.firma_a_calidad_dgm && (
                                <View style={{
                                    marginLeft: 8,
                                    backgroundColor: '#fff3cd',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                }}>
                                    <Text style={{ color: '#856404', fontSize: 10, fontWeight: 'bold' }}>PENDIENTE</Text>
                                </View>
                            )}
                        </View>
                        {firmas.firma_a_calidad_dgm && (
                            <Image
                                source={{ uri: firmas.firma_a_calidad_dgm }}
                                style={{ width: '100%', height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' }}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Botón fijo para firmar */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: '#eee',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            }}>
                <TouchableOpacity
                    style={{
                        backgroundColor: rolInfo.color,
                        padding: 16,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={irAFirmar}
                >
                    <Ionicons name="create" size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
                        Proceder a Firmar como {rolInfo.titulo}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = {
    seccion: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tituloSeccion: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    etiqueta: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    valor: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
        flex: 1.5,
        textAlign: 'right',
    },
    firmaItem: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
};