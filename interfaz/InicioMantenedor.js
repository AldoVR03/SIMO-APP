import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity,
    ScrollView, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, startOfWeek, isToday, isBefore, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query, getDocs, doc } from "firebase/firestore";
import { db } from "../servicio/firebase-config";
import estilos, { COLORES } from '../assets/estilos';
import { useFocusEffect } from '@react-navigation/native';

export default function InicioMantenedor({ navigation }) {
    const [diaBase, setDiaBase] = useState(new Date());
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
    const [informeSeleccionado, setInformeSeleccionado] = useState(null);
    const [mostrarRealizados, setMostrarRealizados] = useState(true);
    const [informes, setInformes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const lunes = startOfWeek(diaBase, { weekStartsOn: 1 });

    const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const dia = addDays(lunes, i);
        return {
            fecha: dia,
            diaTexto: format(dia, 'EEE', { locale: es }).toUpperCase(),
            diaNumero: format(dia, 'd', { locale: es }),
            esSeleccionado: format(dia, 'yyyy-MM-dd') === format(diaSeleccionado, 'yyyy-MM-dd'),
        };
    });

    const cargarInformes = useCallback(async () => {
        try {
            setCargando(true);
            
            const diaSeleccionadoFormato = format(diaSeleccionado, 'yyyy-MM-dd');
            const hoy = format(new Date(), 'yyyy-MM-dd');
            const equiposQuery = query(collection(db, "planificacion"));
            const equiposSnapshot = await getDocs(equiposQuery);
            
            let lista = [];
            
            for (const equipoDoc of equiposSnapshot.docs) {
                const equipoData = equipoDoc.data();
                const mantenimientosQuery = query(
                    collection(doc(db, "planificacion", equipoDoc.id), "mantenimientos")
                );
                const mantenimientosSnapshot = await getDocs(mantenimientosQuery);
                
                for (const mantenimientoDoc of mantenimientosSnapshot.docs) {
                    const mantenimientoData = mantenimientoDoc.data();
                    const estado = mantenimientoData.estado;
                    
                    if (mostrarRealizados) {
                        if (mantenimientoData.fecha === diaSeleccionadoFormato) {
                            if (estado === "Pendiente" || estado === "proceso") {
                                lista.push({
                                    id: equipoDoc.id,
                                    equipo: equipoData.equipo,
                                    codigo_sgs: equipoData.codigo_sgs || equipoDoc.id,
                                    mantenimientoDelDia: {
                                        id: mantenimientoDoc.id,
                                        ...mantenimientoData
                                    }
                                });
                                break;
                            }
                        }
                    } 
                    else {
                        if (estado === "Completado" && mantenimientoData.fechaCompletado) {
                            const fechaCompletado = mantenimientoData.fechaCompletado;
                            const fechaLimite = format(addDays(parseISO(fechaCompletado), 4), 'yyyy-MM-dd');

                            if (diaSeleccionadoFormato >= fechaCompletado && diaSeleccionadoFormato <= fechaLimite) {
                                lista.push({
                                    id: equipoDoc.id,
                                    equipo: equipoData.equipo,
                                    codigo_sgs: equipoData.codigo_sgs || equipoDoc.id,
                                    mantenimientoDelDia: {
                                        id: mantenimientoDoc.id,
                                        ...mantenimientoData
                                    }
                                });
                                break;
                            }
                        }

                        if (estado === "Faltante de firmas" && mantenimientoData.fecha === diaSeleccionadoFormato) {
                            lista.push({
                                id: equipoDoc.id,
                                equipo: equipoData.equipo,
                                codigo_sgs: equipoData.codigo_sgs || equipoDoc.id,
                                mantenimientoDelDia: {
                                    id: mantenimientoDoc.id,
                                    ...mantenimientoData
                                }
                            });
                            break;
                        }
                    }
                }
            }
            
            console.log(`📊 Informes cargados (${mostrarRealizados ? 'A Realizar' : 'Terminados'}):`, lista.length);
            setInformes(lista);
        } catch (error) {
            console.error("❌ Error al cargar informes:", error);
        } finally {
            setCargando(false);
        }
    }, [diaSeleccionado, mostrarRealizados]);

    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Pantalla enfocada, recargando informes...');
            cargarInformes();
        }, [cargarInformes])
    );

    const obtenerEstadoTextoYColor = (informe) => {
        const mantenimientoDelDia = informe.mantenimientoDelDia;

        if (!mantenimientoDelDia) {
            return { texto: 'Sin estado', color: '#666', fondo: '#ddd' };
        }

        const hoy = new Date();
        const fechaMantenimiento = new Date(mantenimientoDelDia.fecha + 'T00:00:00');
        const estado = mantenimientoDelDia.estado;

        if (estado === "Faltante de firmas") {
            return { texto: 'Faltante de firmas', color: '#fff', fondo: '#2ecc71' };
        }

        if (estado === "proceso") {
            return { texto: 'En proceso', color: '#fff', fondo: '#f39c12' };
        }

        if (estado === "Pendiente") {
            if (isToday(fechaMantenimiento)) {
                return { texto: 'A tiempo', color: '#fff', fondo: '#f1c40f' };
            }
            if (isBefore(fechaMantenimiento, hoy)) {
                return { texto: 'Vencido', color: '#fff', fondo: '#e74c3c' };
            }
            return { texto: 'Pendiente', color: '#fff', fondo: '#f1c40f' };
        }

        if (estado === "Completado") {
            return { texto: 'Completado', color: '#fff', fondo: '#3498db' };
        }

        return { texto: estado || 'Desconocido', color: '#fff', fondo: '#888' };
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={estilos.contenedor}>
                <View style={estilos.encabezado}>
                    <Text style={estilos.logoTexto}>SGS</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('PerfilMantenedor')}>
                        <Ionicons name="person-circle-outline" size={30} color={COLORES.primario} />
                    </TouchableOpacity>
                </View>

                <View style={estilos.semanaEncabezado}>
                    <TouchableOpacity onPress={() => setDiaBase(subDays(diaBase, 7))}>
                        <Ionicons name="chevron-back" size={24} color="#444" />
                    </TouchableOpacity>
                    <Text style={estilos.mesTexto}>
                        {format(diaSeleccionado, 'MMMM yyyy', { locale: es })}
                    </Text>
                    <TouchableOpacity onPress={() => setDiaBase(addDays(diaBase, 7))}>
                        <Ionicons name="chevron-forward" size={24} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={estilos.semana}>
                    {diasSemana.map((dia, idx) => (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => {
                                setDiaSeleccionado(dia.fecha);
                                setInformeSeleccionado(null);
                            }}
                            style={[
                                estilos.dia,
                                dia.esSeleccionado && estilos.diaSeleccionado,
                            ]}
                        >
                            <Text style={estilos.textoDia}>{dia.diaTexto}</Text>
                            <Text style={estilos.numeroDia}>{dia.diaNumero}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={estilos.botonesFiltro}>
                    <TouchableOpacity
                        onPress={() => {
                            setMostrarRealizados(true);
                            setInformeSeleccionado(null);
                        }}
                        style={[
                            estilos.filtro,
                            { backgroundColor: mostrarRealizados ? COLORES.primario : '#ddd' },
                        ]}
                    >
                        <Text style={[
                            estilos.textoFiltro,
                            { color: mostrarRealizados ? '#fff' : '#555' },
                        ]}>Informes a realizar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            setMostrarRealizados(false);
                            setInformeSeleccionado(null);
                        }}
                        style={[
                            estilos.filtro,
                            { backgroundColor: !mostrarRealizados ? COLORES.primario : '#ddd' },
                        ]}
                    >
                        <Text style={[
                            estilos.textoFiltro,
                            { color: !mostrarRealizados ? '#fff' : '#555' },
                        ]}>Informes terminados</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }}>
                    {cargando ? (
                        <ActivityIndicator size="large" color={COLORES.primario} style={{ marginTop: 20 }} />
                    ) : informes.length === 0 ? (
                        <Text style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                            No hay informes disponibles para esta fecha.
                        </Text>
                    ) : (
                        informes.map((informe) => {
                            const estadoInfo = obtenerEstadoTextoYColor(informe);
                            return (
                                <TouchableOpacity
                                    key={informe.id}
                                    style={[estilos.tarjetaInforme, { backgroundColor: '#fff', borderColor: estadoInfo.fondo, borderWidth: 2 }]}
                                    onPress={() => setInformeSeleccionado(informe)}
                                >
                                    <View style={estilos.tarjetaContenido}>
                                        <Text style={estilos.tituloTarjeta}>{informe.equipo}</Text>
                                        <View style={[estilos.tarjetaEstado, { backgroundColor: estadoInfo.fondo }]}>
                                            <Text style={{ color: estadoInfo.color, fontWeight: 'bold' }}>
                                                {estadoInfo.texto}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
                
                {informeSeleccionado && (
                    <View style={estilos.resumen}>
                        <Text style={estilos.tituloResumen}>Resumen del equipo</Text>
                        <Text>Nombre del equipo: {informeSeleccionado.equipo}</Text>
                        <Text>Código SGS: {informeSeleccionado.codigo_sgs}</Text>
                        <TouchableOpacity
                            style={[estilos.botonIniciar, { backgroundColor: '#FFA500' }]}
                            onPress={() => {
                                const estado = informeSeleccionado.mantenimientoDelDia.estado;

                                if (estado === "Faltante de firmas") {
                                    console.log('Navegando a CompletarFirmas');
                                    navigation.navigate('CompletarFirmas', {
                                        informe: informeSeleccionado,
                                        mantenimientoId: informeSeleccionado.mantenimientoDelDia.id
                                    });
                                }
                                else if (estado === "Completado") {
                                    Alert.alert('Informe Completado', 'Este informe ya está completado y firmado.');
                                }
                                else {
                                    console.log('📤 Navegando a Formulario con:', {
                                        equipoId: informeSeleccionado.id,
                                        mantenimientoId: informeSeleccionado.mantenimientoDelDia.id,
                                        fecha: diaSeleccionado.toISOString()
                                    });
                                    
                                    navigation.navigate('Formulario', {
                                        informe: informeSeleccionado,
                                        fechaSeleccionada: diaSeleccionado.toISOString(),
                                        mantenimientoId: informeSeleccionado.mantenimientoDelDia.id
                                    });
                                }
                            }}
                        >
                            <Text style={estilos.textoBotonIniciar}>
                                {informeSeleccionado.mantenimientoDelDia.estado === "Completado" 
                                    ? "Ver informe"
                                    : informeSeleccionado.mantenimientoDelDia.estado === "Faltante de firmas"
                                    ? "Completar firmas"
                                    : "Iniciar informe"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={estilos.botonera}>
                    <TouchableOpacity style={estilos.botonIcono}
                    onPress={() => navigation.navigate('EscaneoQR')}>
                        <Ionicons name="qr-code-outline" size={32} color={COLORES.primario} />
                        <Text style={estilos.textoBotonIcono}>Escanear QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={estilos.botonIcono}
                        onPress={() => navigation.navigate('BuscarNombre')}
                    >
                        <Ionicons name="search-outline" size={32} color={COLORES.primario} />
                        <Text style={estilos.textoBotonIcono}>Buscar nombre</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}