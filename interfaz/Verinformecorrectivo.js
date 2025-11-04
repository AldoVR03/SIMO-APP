import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function VerInformeCorrectivo({ route, navigation }) {
  const { informe } = route.params;
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const formatearFecha = (fecha) => {
    if (fecha?.toDate) {
      return fecha.toDate().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    if (typeof fecha === 'string') {
      return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    return 'Fecha no disponible';
  };

  const obtenerColorRespuesta = (respuesta) => {
    switch (respuesta) {
      case 'Si': return '#27ae60';
      case 'No': return '#e74c3c';
      case 'No aplica': return '#95a5a6';
      default: return '#000';
    }
  };

  const obtenerColorPrioridad = (prioridad) => {
    switch (prioridad) {
      case 'Baja': return '#95a5a6';
      case 'Media': return '#f39c12';
      case 'Alta': return '#e67e22';
      case 'Crítica': return '#e74c3c';
      default: return '#000';
    }
  };

  const generarHTML = () => {
    // Procesos realizados
    const tablaProcesosHTML = informe.procesosRealizados && informe.procesosRealizados.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 50%;">
              PROCESOS REALIZADOS
            </th>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 15%;">
              SI
            </th>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 15%;">
              NO
            </th>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 20%;">
              N/A
            </th>
          </tr>
        </thead>
        <tbody>
          ${informe.procesosRealizados.map(proceso => {
            const esSi = proceso.respuesta === 'Si';
            const esNo = proceso.respuesta === 'No';
            const esNA = proceso.respuesta === 'No aplica';
            return `
              <tr>
                <td style="border: 2px solid #000; padding: 8px;">
                  ${proceso.descripcion}
                </td>
                <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${esSi ? '#d4edda' : '#fff'};">
                  ${esSi ? '✓' : ''}
                </td>
                <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${esNo ? '#f8d7da' : '#fff'};">
                  ${esNo ? '✓' : ''}
                </td>
                <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${esNA ? '#e2e3e5' : '#fff'};">
                  ${esNA ? '✓' : ''}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '';

    // Evidencias
    const evidencias = informe.evidencias || [];
    const evidenciasHTML = evidencias.length > 0 ? `
      <div style="margin-top: 20px; page-break-before: always;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px;">
          EVIDENCIAS FOTOGRÁFICAS
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          ${evidencias.map((ev, index) => {
            const url = ev.uri || ev.url || ev;
            const desc = ev.descripcion || `Evidencia ${index + 1}`;
            return `
              <div style="border: 1px solid #ddd; padding: 10px; text-align: center; page-break-inside: avoid;">
                <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 11px;">${desc}</p>
                <img src="${url}" style="width: 100%; max-height: 300px; object-fit: cover; border: 1px solid #ccc;" />
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    // Firma
    const firmaHTML = informe.firma ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="border: 2px solid #000; padding: 8px; font-weight: bold; width: 30%; background: #f0f0f0;">
            TÉCNICO
          </td>
          <td style="border: 2px solid #000; padding: 8px;">
            <p style="margin: 0 0 5px 0; font-size: 12px;"><strong>${informe.tecnico || informe.usuario || 'N/A'}</strong></p>
            <img src="${informe.firma}" style="max-width: 200px; max-height: 80px;" />
          </td>
        </tr>
      </table>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { margin: 15px; size: letter; }
            body {
              font-family: Arial, sans-serif;
              padding: 10px;
              color: #000;
              font-size: 11px;
            }
            .titulo-principal {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
              padding: 10px;
              border: 2px solid #000;
              background: #f8e5d5;
            }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 2px solid #000; padding: 6px; }
            .header-cell { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="titulo-principal">
            INFORME CORRECTIVO
            <br/>
            ${informe.nombreEquipo || informe.equipo || 'EQUIPO'}
            <br/>
            <span style="font-size: 12px;">${informe.codigoSGS || informe.codigo_sgs || ''}</span>
          </div>

          <table style="margin-top: 10px;">
            <tr>
              <td class="header-cell" style="width: 20%;">Código SGS</td>
              <td style="width: 30%;">${informe.codigoSGS || informe.codigo_sgs || 'N/A'}</td>
              <td class="header-cell" style="width: 20%;">Prioridad</td>
              <td style="width: 30%; background: ${obtenerColorPrioridad(informe.prioridad)}20;">
                <strong>${informe.prioridad || 'N/A'}</strong>
              </td>
            </tr>
            <tr>
              <td class="header-cell">Fecha Programada</td>
              <td>${informe.fechaProgramada || 'N/A'}</td>
              <td class="header-cell">Duración</td>
              <td>${informe.duracionEstimada || 'N/A'}</td>
            </tr>
            <tr>
              <td class="header-cell">Marca</td>
              <td>${informe.marca || 'N/A'}</td>
              <td class="header-cell">Modelo</td>
              <td>${informe.modelo || 'N/A'}</td>
            </tr>
            <tr>
              <td class="header-cell">N° Serie</td>
              <td colspan="3">${informe.numeroSerie || 'N/A'}</td>
            </tr>
            <tr>
              <td class="header-cell">Ubicación</td>
              <td>${informe.ubicacion || 'N/A'}</td>
              <td class="header-cell">Localidad</td>
              <td>${informe.localidad || 'N/A'}</td>
            </tr>
            <tr>
              <td class="header-cell">Responsable</td>
              <td colspan="3">${informe.responsable || 'N/A'}</td>
            </tr>
          </table>

          <table style="margin-top: 10px;">
            <tr>
              <td class="header-cell" style="width: 25%;">Fecha Inicio</td>
              <td style="width: 25%;">${informe.fechaInicio || 'N/A'} ${informe.horaInicio || ''}</td>
              <td class="header-cell" style="width: 25%;">Fecha Fin</td>
              <td style="width: 25%;">${informe.fechaFinalizacion || 'N/A'} ${informe.horaFinalizacion || ''}</td>
            </tr>
            <tr>
              <td class="header-cell">Tiempo Detenido</td>
              <td colspan="3" style="background: #ffe5e5; font-weight: bold;">
                ${informe.tiempoDetenido || 'N/A'}
              </td>
            </tr>
          </table>

          ${tablaProcesosHTML}
          ${firmaHTML}
          ${evidenciasHTML}
        </body>
      </html>
    `;
  };

  const exportarPDF = async () => {
    try {
      setGenerandoPDF(true);
      const html = generarHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (generandoPDF) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 20, fontSize: 16 }}>Generando PDF...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const evidencias = informe.evidencias || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0 }]}>Informe Correctivo</Text>
        <TouchableOpacity onPress={exportarPDF} style={{ padding: 8 }}>
          <Ionicons name="download" size={24} color={COLORES.primario} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{
          backgroundColor: '#e67e22',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            INFORME CORRECTIVO
          </Text>
          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
            {informe.nombreEquipo || informe.equipo || 'Sin nombre'}
          </Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Datos Generales</Text>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Equipo:</Text>
            <Text style={styles.valorCampo}>{informe.nombreEquipo || informe.equipo || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Código SGS:</Text>
            <Text style={styles.valorCampo}>{informe.codigoSGS || informe.codigo_sgs || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Responsable:</Text>
            <Text style={styles.valorCampo}>{informe.responsable || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Duración Estimada:</Text>
            <Text style={styles.valorCampo}>{informe.duracionEstimada || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Prioridad:</Text>
            <View style={{
              backgroundColor: obtenerColorPrioridad(informe.prioridad),
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                {informe.prioridad || 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Ubicación:</Text>
            <Text style={styles.valorCampo}>{informe.ubicacion || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Localidad:</Text>
            <Text style={styles.valorCampo}>{informe.localidad || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Fechas y Tiempos</Text>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Fecha Programada:</Text>
            <Text style={styles.valorCampo}>{informe.fechaProgramada || 'N/A'}</Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Inicio:</Text>
            <Text style={styles.valorCampo}>
              {informe.fechaInicio || 'N/A'} - {informe.horaInicio || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Finalización:</Text>
            <Text style={styles.valorCampo}>
              {informe.fechaFinalizacion || 'N/A'} - {informe.horaFinalizacion || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Tiempo Detenido:</Text>
            <Text style={[styles.valorCampo, { fontWeight: 'bold', color: '#e74c3c' }]}>
              {informe.tiempoDetenido || 'N/A'}
            </Text>
          </View>
        </View>

        {informe.procesosRealizados && informe.procesosRealizados.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Procesos Realizados ({informe.procesosRealizados.length})
            </Text>
            
            {informe.procesosRealizados.map((proceso, index) => (
              <View 
                key={index}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: obtenerColorRespuesta(proceso.respuesta),
                }}
              >
                <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                  Proceso {index + 1}
                </Text>
                <Text style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>
                  {proceso.descripcion}
                </Text>
                <View style={{
                  alignSelf: 'flex-start',
                  backgroundColor: obtenerColorRespuesta(proceso.respuesta),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                    {proceso.respuesta}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {evidencias.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Evidencias Fotográficas ({evidencias.length})
            </Text>
            
            {evidencias.map((ev, index) => {
              const url = ev.uri || ev.url || ev;
              const desc = ev.descripcion || `Evidencia ${index + 1}`;
              return (
                <View 
                  key={index}
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                    {desc}
                  </Text>
                  <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: 200, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                </View>
              );
            })}
          </View>
        )}

        {informe.firma && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Firma del Técnico</Text>
            <View style={{
              backgroundColor: '#f8f9fa',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                {informe.tecnico || informe.usuario || 'Técnico'}
              </Text>
              <Image
                source={{ uri: informe.firma }}
                style={{ width: 250, height: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 4 }}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: COLORES.primario, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={exportarPDF}
        >
          <Ionicons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={estilosComunes.textoBoton}>Exportar a PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  seccion: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
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
    borderBottomColor: '#e0e0e0',
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  etiquetaCampo: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  valorCampo: {
    fontSize: 13,
    color: '#333',
    flex: 1.5,
    textAlign: 'right',
  },
};