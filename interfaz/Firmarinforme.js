import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Image,
    Platform,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../servicio/firebase-config';
import estilosComunes, { COLORES } from '../assets/estilos';

// Importar Firebase Storage y servicio de validación
import { subirBase64Storage } from '../servicio/Storageservice';
import { validarFirmaInforme } from '../servicio/verificacionService';

const SignatureCanvas = Platform.OS !== 'web'
    ? require('react-native-signature-canvas').default
    : () => null;

export default function FirmarInforme({ navigation, route }) {
    const { informe, tipoFirma } = route.params || {};

    const [guardando, setGuardando] = useState(false);
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [firma, setFirma] = useState(null);
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const signatureRef = useRef(null);

    // Estados para validación de firma
    const [usuarioVerificado, setUsuarioVerificado] = useState(false);
    const [validandoFirma, setValidandoFirma] = useState(false);
    const [firmaValidada, setFirmaValidada] = useState(false);
    const [resultadoValidacion, setResultadoValidacion] = useState(null);

    // Configuración según el tipo de firma
    const configRol = {
        supervisor: {
            titulo: 'Supervisor',
            campoFirma: 'firma_supervisor',
            campoNombre: 'nombre_supervisor',
            siguientePantalla: 'InicioSupervisor',
            perfilPantalla: 'PerfilSupervisor',
        },
        calidad: {
            titulo: 'Control de Calidad Codelco',
            campoFirma: 'firma_a_calidad_dgm',
            campoNombre: 'nombre_calidad',
            siguientePantalla: 'InicioCalidad',
            perfilPantalla: 'PerfilCalidad',
        },
    };

    const config = configRol[tipoFirma] || configRol.supervisor;

    // Cargar nombre del usuario y estado de verificación
    useEffect(() => {
        const cargarUsuario = async () => {
            if (auth.currentUser) {
                try {
                    const docRef = doc(db, 'Usuario', auth.currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setNombreUsuario(data.nombre || data.displayName || auth.currentUser.email);

                        // Verificar si el usuario tiene verificación de identidad
                        const verificacion = data.verificacion;
                        if (verificacion && verificacion.estado === 'verificado') {
                            setUsuarioVerificado(true);
                            console.log('✅ Usuario verificado, umbral:', verificacion.umbralSimilitud);
                        } else {
                            setUsuarioVerificado(false);
                            console.log('⚠️ Usuario NO verificado');
                        }
                    }
                } catch (error) {
                    console.error('Error cargando usuario:', error);
                }
            }
        };
        cargarUsuario();
    }, []);

    // Safety check
    if (!informe) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={60} color="#e74c3c" />
                <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
                    Error: No se cargaron los datos del informe.
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginTop: 20, padding: 12, backgroundColor: COLORES.primario, borderRadius: 8 }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Manejar respuestas
    let respuestasArray = [];
    if (informe.respuestas) {
        if (Array.isArray(informe.respuestas)) {
            respuestasArray = informe.respuestas;
        } else if (typeof informe.respuestas === 'object') {
            respuestasArray = Object.values(informe.respuestas).filter(r => r && r.pregunta);
        }
    }

    // Manejar imágenes/evidencias
    let imagenes = [];
    const rawEvidencias = informe.evidencias || informe.imagenes;
    if (rawEvidencias) {
        if (Array.isArray(rawEvidencias)) {
            imagenes = rawEvidencias;
        } else if (typeof rawEvidencias === 'object') {
            imagenes = Object.values(rawEvidencias);
        }
    }

    const firmas = informe.firmas || {};
    const nombres = informe.nombres || {};

    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin fecha';
        if (fecha.seconds) {
            return new Date(fecha.seconds * 1000).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        }
        if (fecha.toDate) return fecha.toDate().toLocaleDateString('es-CL');
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
                return '#666';
        }
    };

    const handleFirma = (signature) => {
        let dataUri = signature;
        if (!signature.startsWith('data:image')) {
            dataUri = `data:image/png;base64,${signature}`;
        }
        setFirma(dataUri);
        // Resetear validación cuando se firma de nuevo
        setFirmaValidada(false);
        setResultadoValidacion(null);
        console.log('✅ Firma capturada');
    };

    const limpiarFirma = () => {
        if (signatureRef.current) {
            signatureRef.current.clearSignature();
        }
        setFirma(null);
        setFirmaValidada(false);
        setResultadoValidacion(null);
    };

    const guardarFirma = () => {
        if (signatureRef.current) {
            signatureRef.current.readSignature();
        }
    };

    // Validar firma contra las de referencia
    const validarFirmaUsuario = async () => {
        if (!firma) {
            Alert.alert('Error', 'Primero debes firmar en el canvas');
            return;
        }

        if (!usuarioVerificado) {
            Alert.alert(
                'Verificación Requerida',
                'Debes verificar tu identidad en tu perfil antes de poder firmar informes.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ir a Perfil',
                        onPress: () => navigation.navigate(config.perfilPantalla)
                    }
                ]
            );
            return;
        }

        setValidandoFirma(true);

        try {
            console.log('🔍 Validando firma...');
            const resultado = await validarFirmaInforme(firma);

            if (resultado.success) {
                setResultadoValidacion(resultado.resultado);

                if (resultado.resultado.esValida) {
                    setFirmaValidada(true);
                    Alert.alert(
                        '✅ Firma Válida',
                        `Tu firma coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}%`,
                        [{ text: 'Continuar' }]
                    );
                } else {
                    setFirmaValidada(false);
                    Alert.alert(
                        '❌ Firma No Válida',
                        `Tu firma no coincide con la registrada.\nSimilitud: ${resultado.resultado.similitud}%\nRequerido: ${resultado.resultado.umbral}%\n\nPor favor, intenta firmar de nuevo.`,
                        [{ text: 'Reintentar' }]
                    );
                }
            } else {
                throw new Error(resultado.error || 'Error en validación');
            }
        } catch (error) {
            console.error('❌ Error validando firma:', error);
            Alert.alert('Error', 'No se pudo validar la firma. ' + error.message);
        } finally {
            setValidandoFirma(false);
        }
    };

    const confirmarYGuardar = async () => {
        if (!firma) {
            Alert.alert('Firma requerida', 'Por favor firma antes de guardar.');
            return;
        }

        // Si el usuario está verificado, la firma debe estar validada
        if (usuarioVerificado && !firmaValidada) {
            Alert.alert(
                'Validación requerida',
                'Debes validar tu firma antes de guardar. Presiona el botón "Validar Firma".',
                [{ text: 'Entendido' }]
            );
            return;
        }

        // Si NO está verificado, no puede firmar
        if (!usuarioVerificado) {
            Alert.alert(
                'Verificación Requerida',
                'Debes verificar tu identidad en tu perfil antes de poder firmar informes.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ir a Perfil',
                        onPress: () => navigation.navigate(config.perfilPantalla)
                    }
                ]
            );
            return;
        }

        Alert.alert(
            'Confirmar Firma',
            `¿Estás seguro de firmar este informe como ${config.titulo}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            setGuardando(true);

                            // Subir firma a Firebase Storage
                            console.log('📤 Subiendo firma a Storage...');
                            const firmaUrl = await subirBase64Storage(
                                firma,
                                `firmas_informes/${informe.id}`,
                                `${config.campoFirma}_${Date.now()}.png`
                            );

                            if (!firmaUrl) {
                                throw new Error('No se pudo subir la firma');
                            }

                            console.log('✅ Firma subida:', firmaUrl);

                            // Actualizar el documento en Firestore
                            const informeRef = doc(db, 'informePreventivo', informe.id);

                            const actualizacion = {
                                [`firmas.${config.campoFirma}`]: firmaUrl,
                                [`nombres.${config.campoNombre}`]: nombreUsuario,
                            };

                            // Si es calidad, el informe está completo
                            if (tipoFirma === 'calidad') {
                                actualizacion.estado = 'Completado';
                                actualizacion.fechaCompletado = new Date().toISOString();
                            }

                            await updateDoc(informeRef, actualizacion);

                            console.log('✅ Informe actualizado en Firestore');

                            Alert.alert(
                                '✅ Éxito',
                                `Informe firmado correctamente como ${config.titulo}.`,
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => navigation.navigate(config.siguientePantalla),
                                    },
                                ]
                            );
                        } catch (error) {
                            console.error('❌ Error al guardar firma:', error);
                            Alert.alert('Error', 'No se pudo guardar la firma: ' + error.message);
                        } finally {
                            setGuardando(false);
                        }
                    },
                },
            ]
        );
    };

    // Determinar si puede guardar
    const puedeGuardar = firma && usuarioVerificado && firmaValidada;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
            {/* Header */}
            <View style={estilosComunes.encabezado}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
                </TouchableOpacity>
                <Text style={[estilosComunes.titulo, { margin: 0, fontSize: 18 }]}>
                    Firmar como {config.titulo}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
                scrollEnabled={scrollEnabled}
            >
                {/* Banner de verificación */}
                {usuarioVerificado ? (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#d4edda',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 16,
                    }}>
                        <Ionicons name="shield-checkmark" size={20} color="#155724" />
                        <Text style={{ color: '#155724', marginLeft: 10, fontWeight: '500', flex: 1 }}>
                            Identidad verificada - Se validará tu firma
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#f8d7da',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 16,
                        }}
                        onPress={() => navigation.navigate(config.perfilPantalla)}
                    >
                        <Ionicons name="warning" size={20} color="#721c24" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={{ color: '#721c24', fontWeight: '600' }}>
                                Verificación requerida
                            </Text>
                            <Text style={{ color: '#721c24', fontSize: 12 }}>
                                Toca aquí para verificar tu identidad
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#721c24" />
                    </TouchableOpacity>
                )}

                {/* Info del equipo */}
                <View style={estilos.seccion}>
                    <View style={{
                        backgroundColor: COLORES.primario,
                        padding: 16,
                        borderRadius: 8,
                        marginBottom: 16,
                        alignItems: 'center',
                    }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                            {informe.equipo || 'EQUIPO SIN NOMBRE'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                            {informe.codigo_sgs || informe.codigoSGS || 'Sin código'}
                        </Text>
                    </View>

                    <FilaDato label="Marca" valor={informe.marca} />
                    <FilaDato label="Modelo" valor={informe.modelo} />
                    <FilaDato label="N° Serie" valor={informe.numero_serie || informe.numeroSerie} />
                    <FilaDato label="Fecha" valor={formatearFecha(informe.fecha)} />
                    <FilaDato label="Mantenedor" valor={informe.usuario} />
                </View>

                {/* Pauta de Mantención */}
                {respuestasArray.length > 0 && (
                    <View style={estilos.seccion}>
                        <Text style={estilos.tituloSeccion}>
                            Pauta de Mantención ({respuestasArray.length} ítems)
                        </Text>
                        {respuestasArray.map((item, index) => (
                            <View key={index} style={estilos.itemPauta}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>{item.pregunta}</Text>
                                    <View style={[estilos.badge, { backgroundColor: obtenerColorRespuesta(item.respuesta) }]}>
                                        <Text style={estilos.badgeText}>{item.respuesta}</Text>
                                    </View>
                                </View>
                                {item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && item.otros.length > 0 && (
                                    <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#ddd' }}>
                                        {item.otros.map((accion, idx) => (
                                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                                                <Text style={{ flex: 1, fontSize: 13, color: '#555' }}>• {accion.accion}</Text>
                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: obtenerColorRespuesta(accion.respuesta) }}>
                                                    {accion.respuesta}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Evidencias */}
                {imagenes.length > 0 && (
                    <View style={estilos.seccion}>
                        <Text style={estilos.tituloSeccion}>Evidencias ({imagenes.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {imagenes.map((img, index) => (
                                <View key={index} style={estilos.contenedorImagen}>
                                    <Image
                                        source={{ uri: img }}
                                        style={{ width: 180, height: 140, borderRadius: 8 }}
                                        resizeMode="cover"
                                    />
                                    <Text style={estilos.labelImagen}>Evidencia {index + 1}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Firmas existentes */}
                <View style={estilos.seccion}>
                    <Text style={estilos.tituloSeccion}>Firmas del Informe</Text>

                    {/* Firma Mantenedor */}
                    <View style={estilos.firmaDisplay}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons
                                name={firmas.firma_mantenedor ? 'checkmark-circle' : 'close-circle'}
                                size={20}
                                color={firmas.firma_mantenedor ? '#27ae60' : '#ccc'}
                            />
                            <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORES.texto }}>Mantenedor</Text>
                            {nombres.nombre_mantenedor && (
                                <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
                                    ({nombres.nombre_mantenedor})
                                </Text>
                            )}
                        </View>
                        {firmas.firma_mantenedor ? (
                            <Image
                                source={{ uri: firmas.firma_mantenedor }}
                                style={{ width: '100%', height: 80, borderRadius: 8 }}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={{ fontStyle: 'italic', color: '#999', textAlign: 'center' }}>Sin firma</Text>
                        )}
                    </View>

                    {/* Firma Supervisor (si ya existe) */}
                    {firmas.firma_supervisor && (
                        <View style={estilos.firmaDisplay}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
                                <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORES.texto }}>Supervisor</Text>
                                {nombres.nombre_supervisor && (
                                    <Text style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
                                        ({nombres.nombre_supervisor})
                                    </Text>
                                )}
                            </View>
                            <Image
                                source={{ uri: firmas.firma_supervisor }}
                                style={{ width: '100%', height: 80, borderRadius: 8 }}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                </View>

                {/* Canvas de firma */}
                <View style={estilos.seccion}>
                    <Text style={estilos.tituloSeccion}>Tu Firma como {config.titulo}</Text>

                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Nombre:</Text>
                        <TextInput
                            style={{
                                backgroundColor: '#f5f5f5',
                                padding: 12,
                                borderRadius: 8,
                                fontSize: 14,
                                color: COLORES.texto,
                            }}
                            value={nombreUsuario}
                            onChangeText={setNombreUsuario}
                            placeholder="Tu nombre"
                        />
                    </View>

                    <View style={{
                        height: 200,
                        borderWidth: 2,
                        borderColor: firmaValidada ? '#27ae60' : firma ? COLORES.primario : '#ddd',
                        borderRadius: 8,
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                    }}>
                        {Platform.OS !== 'web' ? (
                            <SignatureCanvas
                                ref={signatureRef}
                                onOK={handleFirma}
                                onEmpty={() => Alert.alert('Firma vacía', 'Por favor dibuja tu firma')}
                                onBegin={() => setScrollEnabled(false)}
                                onEnd={() => setScrollEnabled(true)}
                                descriptionText=""
                                clearText="Limpiar"
                                confirmText="Guardar"
                                webStyle={`
                  .m-signature-pad { box-shadow: none; border: none; }
                  .m-signature-pad--body { border: none; }
                  .m-signature-pad--footer { display: none; }
                  body, html { margin: 0; padding: 0; }
                `}
                            />
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: '#999' }}>Canvas no disponible en web</Text>
                            </View>
                        )}
                    </View>

                    {/* Indicador de firma guardada */}
                    {firma && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 8,
                            backgroundColor: firmaValidada ? '#d4edda' : '#e7f3ff',
                            padding: 8,
                            borderRadius: 6,
                        }}>
                            <Ionicons
                                name={firmaValidada ? "checkmark-circle" : "information-circle"}
                                size={18}
                                color={firmaValidada ? "#155724" : "#004085"}
                            />
                            <Text style={{
                                marginLeft: 8,
                                color: firmaValidada ? "#155724" : "#004085",
                                fontWeight: '600'
                            }}>
                                {firmaValidada ? 'Firma validada correctamente' : 'Firma capturada - Debes validarla'}
                            </Text>
                        </View>
                    )}

                    {/* Resultado de validación */}
                    {resultadoValidacion && (
                        <View style={{
                            marginTop: 8,
                            padding: 10,
                            backgroundColor: resultadoValidacion.esValida ? '#d4edda' : '#f8d7da',
                            borderRadius: 6,
                        }}>
                            <Text style={{
                                color: resultadoValidacion.esValida ? '#155724' : '#721c24',
                                fontSize: 13,
                                textAlign: 'center',
                                fontWeight: '600',
                            }}>
                                Similitud: {resultadoValidacion.similitud}% | Requerido: {resultadoValidacion.umbral}%
                            </Text>
                        </View>
                    )}

                    {/* Botones del canvas */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                        <TouchableOpacity
                            onPress={guardarFirma}
                            style={[estilosComunes.boton, { flex: 1, marginRight: 8 }]}
                        >
                            <Text style={estilosComunes.textoBoton}>Capturar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={limpiarFirma}
                            style={{
                                flex: 1,
                                backgroundColor: '#6c757d',
                                padding: 14,
                                borderRadius: 8,
                                marginLeft: 8,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Limpiar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Botón de validación */}
                    {usuarioVerificado && firma && !firmaValidada && (
                        <TouchableOpacity
                            onPress={validarFirmaUsuario}
                            disabled={validandoFirma}
                            style={{
                                backgroundColor: '#007bff',
                                padding: 14,
                                borderRadius: 8,
                                marginTop: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {validandoFirma ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="finger-print" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 15 }}>
                                        Validar mi Firma
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Botón si ya está validada */}
                    {firmaValidada && (
                        <View style={{
                            backgroundColor: '#28a745',
                            padding: 14,
                            borderRadius: 8,
                            marginTop: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 15 }}>
                                ✓ Firma Validada
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Botón fijo para confirmar */}
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
            }}>
                <TouchableOpacity
                    style={[
                        estilosComunes.boton,
                        { backgroundColor: puedeGuardar ? '#27ae60' : '#ccc' }
                    ]}
                    onPress={confirmarYGuardar}
                    disabled={!puedeGuardar || guardando}
                >
                    {guardando ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={estilosComunes.textoBoton}>
                            {!usuarioVerificado
                                ? 'Debes verificar tu identidad'
                                : !firma
                                    ? 'Primero captura tu firma'
                                    : !firmaValidada
                                        ? 'Primero valida tu firma'
                                        : 'Confirmar y Guardar Firma'
                            }
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Componente auxiliar
const FilaDato = ({ label, valor }) => (
    <View style={{ flexDirection: 'row', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ flex: 1, fontSize: 13, color: '#666' }}>{label}</Text>
        <Text style={{ flex: 1.5, fontSize: 13, color: '#333', textAlign: 'right' }}>{valor || 'N/A'}</Text>
    </View>
);

const estilos = StyleSheet.create({
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
    itemPauta: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    contenedorImagen: {
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 4,
    },
    labelImagen: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    firmaDisplay: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
});