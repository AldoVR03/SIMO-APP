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
} from 'react-native';
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "../servicio/firebase-config";
import { COLORES } from '../assets/estilos';

const opciones = ['Sí', 'No', 'No aplica'];
const opcionesOtros = ['Sí', 'No'];

export default function Formulario({ route, navigation }) {
    const [respuestas, setRespuestas] = useState({});
    const [preguntas, setPreguntas] = useState([]);
    const [cargando, setCargando] = useState(true);

    const { informe, mantenimientoId } = route.params;

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
        cargarPautaMantenimiento();
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

    const agregarComentario = (preguntaTexto, indice, comentario) => {
        if (!comentario.trim()) return;

        setRespuestas(prevRespuestas => {
            const nuevaRespuesta = {
                ...prevRespuestas[indice],
                otros: [...(prevRespuestas[indice]?.otros || []), comentario.trim()],
            };
            return {
                ...prevRespuestas,
                [indice]: nuevaRespuesta,
            };
        });
    };

    const eliminarComentario = (indicePregunta, indiceComentario) => {
        setRespuestas(prevRespuestas => {
            const comentariosActualizados = prevRespuestas[indicePregunta].otros.filter(
                (_, i) => i !== indiceComentario
            );
            const nuevaRespuesta = {
                ...prevRespuestas[indicePregunta],
                otros: comentariosActualizados,
            };
            return {
                ...prevRespuestas,
                [indicePregunta]: nuevaRespuesta,
            };
        });
    };

    const navegarAEvidencia = () => {
        navigation.navigate('Evidencia', {
            informe,
            respuestas,
            mantenimientoId,
        });
    };

    if (cargando) {
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
                        <Text style={estilos.textoInfo}>Equipo: {informe.equipo || 'No especificado'}</Text>
                        <Text style={estilos.textoInfo}>Código SGS: {informe.codigo_sgs || 'No especificado'}</Text>
                    </View>
                    {preguntas.length === 0 ? (
                        <View style={estilos.mensajeVacio}>
                            <Text style={estilos.textoMensajeVacio}>
                                No se encontraron preguntas para este equipo.
                            </Text>
                            <Text style={estilos.textoMensajeVacioDetalle}>
                                Verifica que exista una plantilla con ID: {informe.id}
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
                                        <OtrosComentarios
                                            comentarios={comentariosActuales}
                                            onAdd={(comentario) => agregarComentario(preguntaTexto, index, comentario)}
                                            onDelete={(i) => eliminarComentario(index, i)}
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

const OtrosComentarios = ({ comentarios, onAdd, onDelete }) => {
    const [entradaTemporal, setEntradaTemporal] = useState('');

    const handleAdd = () => {
        onAdd(entradaTemporal);
        setEntradaTemporal('');
    };

    return (
        <View style={estilos.otrosBloque}>
            <Text style={estilos.tituloComentarios}>Observaciones:</Text>
            <View style={estilos.entradaFila}>
                <TextInput
                    placeholder="Escribe una observación"
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
            {comentarios.map((comentario, i) => (
                <View key={i} style={estilos.comentarioContainer}>
                    <Text style={estilos.comentarioItem}>• {comentario}</Text>
                    <TouchableOpacity
                        onPress={() => onDelete(i)}
                        style={estilos.botonEliminar}
                    >
                        <Text style={estilos.textoEliminar}>×</Text>
                    </TouchableOpacity>
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
