import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    Alert,
} from 'react-native';
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "../servicio/firebase-config";
import { COLORES } from '../assets/estilos';
import { obtenerPlantillas } from '../servicio/offline-storage';
import { verificarConexionInternet } from '../servicio/network-service';

const opciones = ['Sí', 'No', 'No aplica'];
const opcionesOtros = ['Sí', 'No'];

export default function Formulario({ route, navigation }) {
    const [respuestas, setRespuestas] = useState({});
    const [preguntas, setPreguntas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [informeCompleto, setInformeCompleto] = useState(null);

    const { informe, mantenimientoId } = route.params;

    useEffect(() => {
        async function cargarDatosCompletos() {
            try {
                setCargando(true);

                if (informe && (informe.codigo_sgs || informe.id)) {
                    const idDoc = informe.codigo_sgs || informe.id;
                    const equipoRef = doc(db, "plantilla", idDoc);
                    const equipoSnap = await getDoc(equipoRef);

                    if (equipoSnap.exists()) {
                        const datosEquipo = equipoSnap.data();
                        const informeConDatos = {
                            ...informe,
                            marca: datosEquipo.marca || 'No especificado',
                            modelo: datosEquipo.modelo || 'No especificado',
                            numero_serie: datosEquipo.numero_serie || 'No especificado'
                        };
                        setInformeCompleto(informeConDatos);
                        console.log('✅ Datos del equipo cargados:', informeConDatos);
                    } else {
                        setInformeCompleto(informe);
                        console.log('⚠️ No se encontró el documento del equipo en plantilla');
                    }
                } else {
                    setInformeCompleto(informe);
                }
            } catch (error) {
                console.error('❌ Error al cargar datos del equipo:', error);
                setInformeCompleto(informe);
            } finally {
                setCargando(false);
            }
        }

        async function cargarDatosOffline() {
            try {
                const plantillasOffline = await obtenerPlantillas();
                const idDoc = informe.codigo_sgs || informe.id;

                if (plantillasOffline && plantillasOffline[idDoc]) {
                    const datosEquipo = plantillasOffline[idDoc];
                    const informeConDatos = {
                        ...informe,
                        marca: datosEquipo.marca || 'No especificado',
                        modelo: datosEquipo.modelo || 'No especificado',
                        numero_serie: datosEquipo.numero_serie || 'No especificado'
                    };
                    setInformeCompleto(informeConDatos);
                    console.log('✅ Datos del equipo cargados desde OFFLINE:', informeConDatos);
                } else {
                    console.log('⚠️ No se encontraron datos offline para:', idDoc);
                    setInformeCompleto(informe);
                }
            } catch (error) {
                console.error('❌ Error cargando datos offline:', error);
                setInformeCompleto(informe);
            }
        }

        const verificarYCargar = async () => {
            const conectado = await verificarConexionInternet();
            if (conectado) {
                cargarDatosCompletos();
            } else {
                console.log('📴 Modo offline detectado en Formulario');
                cargarDatosOffline();
            }
        };

        verificarYCargar();
    }, [informe?.codigo_sgs, informe?.id]);


    useEffect(() => {
        async function cargarPautaMantenimiento() {
            try {
                if (!informe || !informe.id) {
                    console.log("No hay informe o ID:", informe);
                    setPreguntas([]);
                    return;
                }

                setCargando(true);
                console.log("Buscando plantilla para ID:", informe.id);

                try {
                    const docRef = doc(db, "plantilla", informe.id);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const docData = docSnap.data();
                        let pautaEncontrada = null;

                        if (docData.pauta_mantenimiento && Array.isArray(docData.pauta_mantenimiento)) {
                            pautaEncontrada = docData.pauta_mantenimiento;
                        } else if (docData.Plan_de_mantencion && Array.isArray(docData.Plan_de_mantencion)) {
                            pautaEncontrada = docData.Plan_de_mantencion;
                        } else if (docData["plan de mantencion"] && Array.isArray(docData["plan de mantencion"])) {
                            pautaEncontrada = docData["plan de mantencion"];
                        }

                        if (pautaEncontrada) {
                            setPreguntas(pautaEncontrada);
                            console.log("Preguntas cargadas:", pautaEncontrada.length);
                        } else {
                            console.log("No se encontró pauta de mantenimiento válida en la plantilla");
                            setPreguntas([]);
                        }
                    } else {
                        console.log("No existe plantilla con ID:", informe.id);
                        setPreguntas([]);
                    }
                } catch (docError) {
                    console.error("Error al acceder al documento de plantilla:", docError);
                    setPreguntas([]);
                }

            } catch (error) {
                console.error("Error general al cargar pauta de mantenimiento:", error);
                setPreguntas([]);
            } finally {
                setCargando(false);
            }
        }

        async function cargarPautaOffline() {
            try {
                const plantillasOffline = await obtenerPlantillas();
                const idDoc = informe.id;

                let docData = plantillasOffline[idDoc];

                if (!docData && informe.codigo_sgs) {
                    docData = plantillasOffline[informe.codigo_sgs];
                }

                if (docData) {
                    console.log("✅ Plantilla encontrada OFFLINE");
                    let pautaEncontrada = null;

                    if (docData.pauta_mantenimiento && Array.isArray(docData.pauta_mantenimiento)) {
                        pautaEncontrada = docData.pauta_mantenimiento;
                    } else if (docData.Plan_de_mantencion && Array.isArray(docData.Plan_de_mantencion)) {
                        pautaEncontrada = docData.Plan_de_mantencion;
                    } else if (docData["plan de mantencion"] && Array.isArray(docData["plan de mantencion"])) {
                        pautaEncontrada = docData["plan de mantencion"];
                    }

                    if (pautaEncontrada) {
                        setPreguntas(pautaEncontrada);
                        console.log("Preguntas cargadas desde OFFLINE:", pautaEncontrada.length);
                    } else {
                        console.log("No se encontró pauta válida en plantilla offline");
                        setPreguntas([]);
                    }
                } else {
                    console.log("❌ No se encontró plantilla offline para ID:", idDoc);
                    setPreguntas([]);
                }
            } catch (error) {
                console.error("Error cargando pauta offline:", error);
                setPreguntas([]);
            } finally {
                setCargando(false);
            }
        }

        const verificarYCargarPauta = async () => {
            const conectado = await verificarConexionInternet();
            if (conectado) {
                cargarPautaMantenimiento();
            } else {
                cargarPautaOffline();
            }
        };

        verificarYCargarPauta();
    }, [informe?.id]);

    const manejarRespuesta = (preguntaTexto, indice, valor) => {
        setRespuestas(prevRespuestas => {
            const nuevaRespuesta = {
                pregunta: preguntaTexto,
                respuesta: valor,
                otros: prevRespuestas[indice]?.otros || [],
            };
            return {
                ...prevRespuestas,
                [indice]: nuevaRespuesta,
            };
        });
    };

    const agregarAccion = (preguntaTexto, indice, accion) => {
        if (!accion.trim()) return;

        setRespuestas(prevRespuestas => {
            const nuevaRespuesta = {
                ...prevRespuestas[indice],
                otros: [
                    ...(prevRespuestas[indice]?.otros || []),
                    { accion: accion.trim(), respuesta: null }
                ],
            };
            return {
                ...prevRespuestas,
                [indice]: nuevaRespuesta,
            };
        });
    };

    const actualizarRespuestaAccion = (indicePregunta, indiceAccion, respuesta) => {
        setRespuestas(prevRespuestas => {
            const otrosActualizados = [...prevRespuestas[indicePregunta].otros];
            otrosActualizados[indiceAccion] = {
                ...otrosActualizados[indiceAccion],
                respuesta: respuesta,
            };
            const nuevaRespuesta = {
                ...prevRespuestas[indicePregunta],
                otros: otrosActualizados,
            };
            return {
                ...prevRespuestas,
                [indicePregunta]: nuevaRespuesta,
            };
        });
    };

    const eliminarAccion = (indicePregunta, indiceAccion) => {
        setRespuestas(prevRespuestas => {
            const otrosActualizados = prevRespuestas[indicePregunta].otros.filter(
                (_, i) => i !== indiceAccion
            );
            const nuevaRespuesta = {
                ...prevRespuestas[indicePregunta],
                otros: otrosActualizados,
            };
            return {
                ...prevRespuestas,
                [indicePregunta]: nuevaRespuesta,
            };
        });
    };

    const navegarAEvidencia = () => {
        // Verificar si todas las preguntas obligatorias están respondidas
        const preguntasSinResponder = [];

        // Encontrar el índice de la pregunta "Otros"
        const indiceOtros = preguntas.findIndex(p => {
            const texto = p.pregunta || p;
            return texto === 'Otros';
        });

        // Si "Otros" tiene respuesta "No", solo validar que "Otros" esté respondido
        const otrosRespondioNo = indiceOtros !== -1 && respuestas[indiceOtros]?.respuesta === 'No';

        preguntas.forEach((pregunta, index) => {
            const preguntaTexto = pregunta.pregunta || pregunta;
            const esOtros = preguntaTexto === 'Otros';

            // Si "Otros" respondió "No", no validar las demás preguntas
            if (otrosRespondioNo && !esOtros) {
                return;
            }

            // Validar que la pregunta tenga respuesta
            if (!respuestas[index]?.respuesta) {
                preguntasSinResponder.push(preguntaTexto);
            }

            // Si es "Otros" y respondió "Sí", validar que todas las acciones tengan respuesta
            if (esOtros && respuestas[index]?.respuesta === 'Sí') {
                const acciones = respuestas[index]?.otros || [];
                const accionesSinResponder = acciones.filter(acc => !acc.respuesta);

                if (accionesSinResponder.length > 0) {
                    accionesSinResponder.forEach(acc => {
                        preguntasSinResponder.push(`"${acc.accion}" en Otros mantenciones`);
                    });
                }
            }
        });

        // Si hay preguntas sin responder, mostrar alerta
        if (preguntasSinResponder.length > 0) {
            const mensaje = preguntasSinResponder.length === 1
                ? `Falta responder la siguiente pregunta:\n\n• ${preguntasSinResponder[0]}`
                : `Faltan responder las siguientes preguntas:\n\n${preguntasSinResponder.map(p => `• ${p}`).join('\n')}`;

            Alert.alert(
                'Preguntas sin responder',
                mensaje,
                [{ text: 'Entendido', style: 'default' }]
            );
            return;
        }

        // Si todo está correcto, navegar a Evidencia
        navigation.navigate('Evidencia', {
            informe: informeCompleto || informe,
            respuestas,
            mantenimientoId,
        });
    };

    if (cargando || !informeCompleto) {
        return (
            <View style={estilos.contenedorCargando}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{ marginTop: 10 }}>Cargando formulario...</Text>
            </View>
        );
    }

    return (
        <View style={estilos.contenedor}>
            <SafeAreaView style={estilos.contenedor}>
                <View style={estilos.encabezado}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={estilos.flechaVolver}>←</Text>
                    </TouchableOpacity>
                    <Text style={estilos.titulo}>Formulario de mantenimiento</Text>
                </View>
                <ScrollView
                    style={estilos.scroll}
                    contentContainerStyle={{ paddingBottom: 140 }}
                >
                    <View style={estilos.info}>
                        <Text style={estilos.textoInfo}>Equipo: {informeCompleto?.equipo || 'No especificado'}</Text>
                        <Text style={estilos.textoInfo}>Código SGS: {informeCompleto?.codigo_sgs || 'No especificado'}</Text>
                        <Text style={estilos.textoInfo}>Marca: {informeCompleto?.marca || 'Cargando...'}</Text>
                        <Text style={estilos.textoInfo}>Modelo: {informeCompleto?.modelo || 'Cargando...'}</Text>
                        <Text style={estilos.textoInfo}>Número de serie: {informeCompleto?.numero_serie || 'Cargando...'}</Text>
                    </View>
                    {preguntas.length === 0 ? (
                        <View style={estilos.mensajeVacio}>
                            <Text style={estilos.textoMensajeVacio}>
                                No se encontraron preguntas para este equipo.
                            </Text>
                            <Text style={estilos.textoMensajeVacioDetalle}>
                                Verifica que exista una plantilla con ID: {informeCompleto?.id || informe?.id}
                            </Text>
                        </View>
                    ) : (
                        preguntas.map((pregunta, index) => {
                            const preguntaTexto = pregunta.pregunta || pregunta;
                            const isOtros = preguntaTexto === 'Otros';
                            const respuestaActual = respuestas[index]?.respuesta;
                            const comentariosActuales = respuestas[index]?.otros || [];

                            return (
                                <View key={pregunta.id || index} style={estilos.bloquePregunta}>
                                    <Text style={estilos.pregunta}>
                                        {preguntaTexto}
                                    </Text>
                                    <View style={estilos.opciones}>
                                        {(isOtros ? opcionesOtros : opciones).map((op, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                style={[
                                                    estilos.opcion,
                                                    respuestaActual === op && estilos.opcionSeleccionada,
                                                ]}
                                                onPress={() => manejarRespuesta(preguntaTexto, index, op)}
                                            >
                                                <Text style={[
                                                    estilos.textoOpcion,
                                                    respuestaActual === op && estilos.textoOpcionSeleccionada
                                                ]}>
                                                    {op}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {isOtros && respuestaActual === 'Sí' && (
                                        <OtrosAcciones
                                            acciones={comentariosActuales}
                                            onAdd={(accion) => agregarAccion(preguntaTexto, index, accion)}
                                            onUpdateRespuesta={(i, resp) => actualizarRespuestaAccion(index, i, resp)}
                                            onDelete={(i) => eliminarAccion(index, i)}
                                        />
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
                <View style={estilos.botonera}>
                    <TouchableOpacity
                        style={estilos.botonFinalizar}
                        onPress={navegarAEvidencia}
                    >
                        <Text style={estilos.textoBotonFinalizar}>Evidencia obtenida</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const OtrosAcciones = ({ acciones, onAdd, onUpdateRespuesta, onDelete }) => {
    const [entradaTemporal, setEntradaTemporal] = useState('');

    const handleAdd = () => {
        onAdd(entradaTemporal);
        setEntradaTemporal('');
    };

    return (
        <View style={estilos.otrosBloque}>
            <Text style={estilos.tituloComentarios}>Otras mantenciones realizadas:</Text>
            <View style={estilos.entradaFila}>
                <TextInput
                    placeholder="Ej: Limpieza de tuberías"
                    style={estilos.inputTexto}
                    value={entradaTemporal}
                    onChangeText={setEntradaTemporal}
                    multiline={true}
                />
                <TouchableOpacity
                    onPress={handleAdd}
                    style={estilos.botonMas}
                    disabled={!entradaTemporal.trim()}
                >
                    <Text style={estilos.textoBotonMas}>+</Text>
                </TouchableOpacity>
            </View>
            {acciones.map((accion, i) => (
                <View key={i} style={estilos.accionContainer}>
                    <View style={estilos.accionHeader}>
                        <Text style={estilos.accionTexto}>• {accion.accion}</Text>
                        <TouchableOpacity
                            onPress={() => onDelete(i)}
                            style={estilos.botonEliminar}
                        >
                            <Text style={estilos.textoEliminar}>×</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={estilos.opcionesAccion}>
                        {opciones.map((op, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    estilos.opcionAccion,
                                    accion.respuesta === op && estilos.opcionSeleccionada,
                                ]}
                                onPress={() => onUpdateRespuesta(i, op)}
                            >
                                <Text style={[
                                    estilos.textoOpcionAccion,
                                    accion.respuesta === op && estilos.textoOpcionSeleccionada
                                ]}>
                                    {op}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
};

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contenedorCargando: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    encabezado: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        paddingTop: 20,
    },
    flechaVolver: {
        fontSize: 26,
        marginRight: 12,
        color: '#ff9900',
        fontWeight: 'bold',
    },
    titulo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    scroll: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f9fa',
    },
    info: {
        marginBottom: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    textoInfo: {
        fontSize: 14,
        marginBottom: 5,
        color: '#555',
    },
    mensajeVacio: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    textoMensajeVacio: {
        textAlign: 'center',
        fontStyle: 'italic',
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    textoMensajeVacioDetalle: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
    },
    bloquePregunta: {
        marginBottom: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    pregunta: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    opciones: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    opcion: {
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ccc',
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    opcionSeleccionada: {
        backgroundColor: COLORES.primario,
        borderWidth: 2,
    },
    textoOpcion: {
        fontSize: 14,
        color: '#333',
    },
    textoOpcionSeleccionada: {
        fontWeight: 'bold',
        color: '#ffffffff',
    },
    otrosBloque: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    tituloComentarios: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#555',
    },
    entradaFila: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    inputTexto: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        flex: 1,
        maxHeight: 80,
        textAlignVertical: 'top',
    },
    botonMas: {
        marginLeft: 8,
        backgroundColor: COLORES.primario,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        justifyContent: 'center',
    },
    textoBotonMas: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    comentarioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingRight: 8,
    },
    comentarioItem: {
        flex: 1,
        fontStyle: 'italic',
        color: '#444',
        fontSize: 14,
    },
    accionContainer: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    accionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    accionTexto: {
        flex: 1,
        fontWeight: '600',
        color: '#333',
        fontSize: 14,
    },
    opcionesAccion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    opcionAccion: {
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ccc',
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    textoOpcionAccion: {
        fontSize: 12,
        color: '#333',
    },
    botonEliminar: {
        marginLeft: 8,
        backgroundColor: '#ff4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textoEliminar: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    botonera: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 30,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    botonFinalizar: {
        backgroundColor: COLORES.primario,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2,
    },
    textoBotonFinalizar: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});