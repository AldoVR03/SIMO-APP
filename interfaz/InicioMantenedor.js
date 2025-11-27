import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity,
    ScrollView, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, startOfWeek, isToday, isBefore, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../servicio/firebase-config";
import estilos, { COLORES } from '../assets/estilos';
import { useFocusEffect } from '@react-navigation/native';
import { useConexionInternet } from '../servicio/network-service';
import {
    sincronizarMantenimientosOffline,
    hayDatosPendientesSincronizar,
} from '../servicio/sync-service';
import {
    guardarPlantillas,
    obtenerPlantillas,
} from '../servicio/offline-storage';
import IndicadorConexion from '../assets/IndicadorConexion';

export default function InicioMantenedor({ navigation }) {
    const [diaBase, setDiaBase] = useState(new Date());
    const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
    const [informeSeleccionado, setInformeSeleccionado] = useState(null);
    const [mostrarRealizados, setMostrarRealizados] = useState(true);
    const [informes, setInformes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [datosPendientes, setDatosPendientes] = useState(0);

    const [cacheDatos, setCacheDatos] = useState(null);
    const [ultimaCarga, setUltimaCarga] = useState(null);

    const { estaConectado } = useConexionInternet();

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

    const descargarPlantillasDelDia = useCallback(async (informesDelDia) => {
        if (!estaConectado || informesDelDia.length === 0) return;

        try {
            console.log(`📥 Descargando plantillas de ${informesDelDia.length} equipos...`);

            const plantillasExistentes = await obtenerPlantillas();
            const plantillasNuevas = { ...plantillasExistentes };
            let descargadas = 0;

            for (const informe of informesDelDia) {
                const codigoSgs = informe.codigo_sgs || informe.id;

                if (plantillasNuevas[codigoSgs]) {
                    console.log(`⏭️ Plantilla ${codigoSgs} ya existe`);
                    continue;
                }

                try {
                    const plantillaRef = doc(db, 'plantilla', codigoSgs);
                    const snapshot = await getDoc(plantillaRef);

                    if (snapshot.exists()) {
                        plantillasNuevas[codigoSgs] = snapshot.data();
                        descargadas++;
                        console.log(`✅ Plantilla descargada: ${codigoSgs}`);
                    } else {
                        console.warn(`⚠️ Plantilla no encontrada: ${codigoSgs}`);
                    }
                } catch (error) {
                    console.error(`❌ Error descargando plantilla ${codigoSgs}:`, error);
                }
            }

            if (descargadas > 0) {
                await guardarPlantillas(plantillasNuevas);
                console.log(`✅ ${descargadas} plantillas nuevas guardadas offline`);
            }
        } catch (error) {
            console.error('❌ Error descargando plantillas del día:', error);
        }
    }, [estaConectado]);

    const cargarTodosDatos = useCallback(async () => {
        try {
            console.log('🔄 Cargando datos desde Firebase...');
            const inicio = Date.now();

            const equiposQuery = query(collection(db, "planificacion"));
            const equiposSnapshot = await getDocs(equiposQuery);

            const todosLosDatos = [];

            const promesas = equiposSnapshot.docs.map(async (equipoDoc) => {
                const equipoData = equipoDoc.data();
                const mantenimientosQuery = query(
                    collection(doc(db, "planificacion", equipoDoc.id), "mantenimientos")
                );
                const mantenimientosSnapshot = await getDocs(mantenimientosQuery);

                mantenimientosSnapshot.docs.forEach((mantenimientoDoc) => {
                    todosLosDatos.push({
                        equipoId: equipoDoc.id,
                        equipo: equipoData.equipo,
                        codigo_sgs: equipoData.codigo_sgs || equipoDoc.id,
                        mantenimientoId: mantenimientoDoc.id,
                        ...mantenimientoDoc.data()
                    });
                });
            });

            await Promise.all(promesas);

            const fin = Date.now();
            console.log(`✅ Datos cargados en ${fin - inicio}ms. Total: ${todosLosDatos.length} registros`);

            return todosLosDatos;
        } catch (error) {
            console.error("❌ Error al cargar datos:", error);
            return [];
        }
    }, []);

    const filtrarInformes = useCallback((datos, fecha, soloRealizados) => {
        const fechaFormato = format(fecha, 'yyyy-MM-dd');

        const filtrados = datos.filter((item) => {
            const estado = item.estado;

            if (soloRealizados) {
                return item.fecha === fechaFormato &&
                    (estado === "Pendiente" || estado === "proceso");
            } else {
                if (estado === "Completado" && item.fechaCompletado) {
                    const fechaCompletado = item.fechaCompletado;
                    const fechaLimite = format(addDays(parseISO(fechaCompletado), 4), 'yyyy-MM-dd');
                    return fechaFormato >= fechaCompletado && fechaFormato <= fechaLimite;
                }

                if (estado === "Faltante de firmas" && item.fecha === fechaFormato) {
                    return true;
                }

                return false;
            }
        });

        return filtrados.map(item => ({
            id: item.equipoId,
            equipo: item.equipo,
            codigo_sgs: item.codigo_sgs,
            mantenimientoDelDia: {
                id: item.mantenimientoId,
                fecha: item.fecha,
                estado: item.estado,
                fechaCompletado: item.fechaCompletado
            }
        }));
    }, []);

    const cargarInformes = useCallback(async (forzarRecarga = false) => {
        try {
            setCargando(true);

            const ahora = Date.now();
            const CACHE_DURACION = 5 * 60 * 1000;

            if (!forzarRecarga && cacheDatos && ultimaCarga && (ahora - ultimaCarga < CACHE_DURACION)) {
                console.log('⚡ Usando caché (instantáneo)');
                const informesFiltrados = filtrarInformes(cacheDatos, diaSeleccionado, mostrarRealizados);
                setInformes(informesFiltrados);
                setCargando(false);
                return;
            }

            console.log('📡 Recargando desde Firebase...');
            const nuevosDatos = await cargarTodosDatos();
            setCacheDatos(nuevosDatos);
            setUltimaCarga(ahora);

            const informesFiltrados = filtrarInformes(nuevosDatos, diaSeleccionado, mostrarRealizados);
            setInformes(informesFiltrados);

            if (estaConectado && informesFiltrados.length > 0) {
                await descargarPlantillasDelDia(informesFiltrados);
            }

        } catch (error) {
            console.error("❌ Error al cargar informes:", error);
        } finally {
            setCargando(false);
        }
    }, [diaSeleccionado, mostrarRealizados, cacheDatos, ultimaCarga, estaConectado, cargarTodosDatos, filtrarInformes, descargarPlantillasDelDia]);

    const sincronizarDatos = useCallback(async () => {
        if (!estaConectado) return;

        try {
            setSincronizando(true);
            const resultado = await sincronizarMantenimientosOffline();

            if (resultado.success && resultado.sincronizados > 0) {
                Alert.alert(
                    'Sincronización exitosa',
                    `Se sincronizaron ${resultado.sincronizados} mantenimiento(s).`
                );
                await cargarInformes(true);
            }
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
        } finally {
            setSincronizando(false);
        }
    }, [estaConectado, cargarInformes]);

    const verificarDatosPendientes = useCallback(async () => {
        const pendientes = await hayDatosPendientesSincronizar();
        setDatosPendientes(pendientes ? 1 : 0);
    }, []);

    useEffect(() => {
        if (estaConectado) {
            verificarDatosPendientes();
            sincronizarDatos();
        }
    }, [estaConectado]);

    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Pantalla enfocada');
            verificarDatosPendientes();
            cargarInformes(true);
        }, [])
    );

    useEffect(() => {
        if (cacheDatos) {
            console.log('⚡ Filtrando desde caché');
            const informesFiltrados = filtrarInformes(cacheDatos, diaSeleccionado, mostrarRealizados);
            setInformes(informesFiltrados);
        } else {
            cargarInformes();
        }
    }, [diaSeleccionado, mostrarRealizados]);

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
            <IndicadorConexion
                estaConectado={estaConectado}
                datosPendientes={datosPendientes}
            />

            <View style={estilos.contenedor}>
                <View style={estilos.encabezado}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={estilos.logoTexto}>SGS</Text>
                        <Ionicons
                            name={estaConectado ? "cloud-done" : "cloud-offline"}
                            size={20}
                            color={estaConectado ? "#2ecc71" : "#e74c3c"}
                        />
                    </View>
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

                {sincronizando && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
                        <ActivityIndicator size="small" color={COLORES.primario} />
                        <Text style={{ fontSize: 12, color: COLORES.primario, marginLeft: 8 }}>
                            Sincronizando...
                        </Text>
                    </View>
                )}

                <ScrollView style={{ flex: 1 }}>
                    {cargando ? (
                        <View style={{ marginTop: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={COLORES.primario} />
                            <Text style={{ marginTop: 10, color: '#888' }}>
                                Cargando informes...
                            </Text>
                        </View>
                    ) : informes.length === 0 ? (
                        <Text style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                            No hay informes disponibles para esta fecha.
                        </Text>
                    ) : (
                        informes.map((informe, index) => {
                            const estadoInfo = obtenerEstadoTextoYColor(informe);
                            return (
                                <TouchableOpacity
                                    key={`${informe.id}-${informe.mantenimientoDelDia?.id || index}`}
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
                                    navigation.navigate('CompletarFirmas', {
                                        informe: informeSeleccionado,
                                        mantenimientoId: informeSeleccionado.mantenimientoDelDia.id
                                    });
                                }
                                else if (estado === "Completado") {
                                    Alert.alert('Informe Completado', 'Este informe ya está completado y firmado.');
                                }
                                else {
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
                    <TouchableOpacity
                        style={estilos.botonIcono}
                        onPress={() => navigation.navigate('EscaneoQR')}
                    >
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