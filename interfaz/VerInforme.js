import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import estilosComunes, { COLORES } from '../assets/estilos';

export default function VerInforme({ route, navigation }) {
  const { informe } = route.params;
  const [generandoPDF, setGenerandoPDF] = useState(false);

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

  const generarHTML = () => {
    const esCorrectivo = informe.tipo === 'Correctivo';

    let procesosHTML = '';
    if (esCorrectivo && informe.procesosRealizados) {
      procesosHTML = `
        <div style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 8px;">
          <h3 style="color: #333; border-bottom: 2px solid #e67e22; padding-bottom: 8px;">
            Procesos Realizados
          </h3>
          ${informe.procesosRealizados.map((proceso, index) => `
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 3px solid ${obtenerColorRespuesta(proceso.respuesta)}; border-radius: 4px;">
              <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">Proceso ${index + 1}</p>
              <p style="margin: 0 0 8px 0; color: #333;">${proceso.descripcion}</p>
              <span style="background: ${obtenerColorRespuesta(proceso.respuesta)}; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">
                ${proceso.respuesta}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    let observacionesHTML = '';
    if (informe.observaciones && informe.observaciones.length > 0) {
      observacionesHTML = `
        <div style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 8px;">
          <h3 style="color: #333; border-bottom: 2px solid #e67e22; padding-bottom: 8px;">
            Observaciones
          </h3>
          ${informe.observaciones.map((obs, index) => `
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
              <p style="color: #999; font-size: 11px; margin: 0 0 5px 0;">Observación ${index + 1}</p>
              <p style="margin: 0; color: #333; line-height: 1.5;">${typeof obs === 'string' ? obs : obs.texto || obs}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    let evidenciasHTML = '';
    if (informe.evidencias && informe.evidencias.length > 0) {
      evidenciasHTML = `
        <div style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 8px;">
          <h3 style="color: #333; border-bottom: 2px solid #e67e22; padding-bottom: 8px;">
            Evidencias Fotográficas
          </h3>
          ${informe.evidencias.map((evidencia, index) => `
            <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
              <p style="color: #999; font-size: 11px; margin: 0 0 8px 0;">Evidencia ${index + 1}</p>
              <img src="${evidencia.url}" style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; margin-bottom: 8px;" />
              <p style="margin: 0; color: #666; font-style: italic; font-size: 12px;">${evidencia.descripcion}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page {
              margin: 20px;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 20px;
              color: #333;
              background: #f5f5f5;
            }
            h1, h2, h3 {
              margin: 0;
              padding: 0;
            }
            .header {
              background: ${esCorrectivo ? '#e67e22' : '#3498db'};
              color: #fff;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 20px;
            }
            .section {
              background: #fff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 15px;
            }
            .section-title {
              color: #333;
              border-bottom: 2px solid ${esCorrectivo ? '#e67e22' : '#3498db'};
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .label {
              color: #666;
              font-weight: 600;
              flex: 1;
            }
            .value {
              color: #333;
              flex: 1.5;
              text-align: right;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              color: #fff;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INFORME ${esCorrectivo ? 'CORRECTIVO' : 'PREVENTIVO'}</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">${informe.nombreEquipo || informe.equipo || 'Sin nombre'}</p>
          </div>

          <div class="section">
            <h3 class="section-title">Datos Generales</h3>
            <div class="row">
              <span class="label">Equipo:</span>
              <span class="value">${informe.nombreEquipo || informe.equipo || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Código SGS:</span>
              <span class="value">${informe.codigoSGS || informe.codigo_sgs || 'N/A'}</span>
            </div>
            ${esCorrectivo ? `
              <div class="row">
                <span class="label">Responsable:</span>
                <span class="value">${informe.responsable || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Duración Estimada:</span>
                <span class="value">${informe.duracionEstimada || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Prioridad:</span>
                <span class="value">
                  <span class="badge" style="background: ${obtenerColorPrioridad(informe.prioridad)};">
                    ${informe.prioridad || 'N/A'}
                  </span>
                </span>
              </div>
              <div class="row">
                <span class="label">Ubicación:</span>
                <span class="value">${informe.ubicacion || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Localidad:</span>
                <span class="value">${informe.localidad || 'N/A'}</span>
              </div>
            ` : `
              <div class="row">
                <span class="label">Técnico:</span>
                <span class="value">${informe.tecnico || informe.usuario || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Fecha:</span>
                <span class="value">${formatearFecha(informe.fecha)}</span>
              </div>
            `}
          </div>

          ${esCorrectivo ? `
            <div class="section">
              <h3 class="section-title">Fechas y Tiempos</h3>
              <div class="row">
                <span class="label">Fecha Programada:</span>
                <span class="value">${informe.fechaProgramada || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Inicio:</span>
                <span class="value">${informe.fechaInicio || 'N/A'} - ${informe.horaInicio || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Finalización:</span>
                <span class="value">${informe.fechaFinalizacion || 'N/A'} - ${informe.horaFinalizacion || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Tiempo Detenido:</span>
                <span class="value" style="color: #e74c3c; font-weight: bold;">${informe.tiempoDetenido || 'N/A'}</span>
              </div>
            </div>
          ` : ''}

          ${procesosHTML}
          ${observacionesHTML}
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
      
      await shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf' 
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const esCorrectivo = informe.tipo === 'Correctivo';

  if (generandoPDF) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORES.primario} />
          <Text style={{ marginTop: 20, fontSize: 16, color: COLORES.texto }}>
            Generando PDF...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0 }]}>
          Ver Informe
        </Text>
        <TouchableOpacity 
          onPress={exportarPDF}
          style={{ padding: 8 }}
        >
          <Ionicons name="download" size={24} color={COLORES.primario} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <View style={{
          backgroundColor: esCorrectivo ? '#e67e22' : '#3498db',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            INFORME {esCorrectivo ? 'CORRECTIVO' : 'PREVENTIVO'}
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

          {esCorrectivo ? (
            <>
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
            </>
          ) : (
            <>
              <View style={styles.fila}>
                <Text style={styles.etiquetaCampo}>Técnico:</Text>
                <Text style={styles.valorCampo}>{informe.tecnico || informe.usuario || 'N/A'}</Text>
              </View>
              
              <View style={styles.fila}>
                <Text style={styles.etiquetaCampo}>Fecha:</Text>
                <Text style={styles.valorCampo}>{formatearFecha(informe.fecha)}</Text>
              </View>
            </>
          )}
        </View>

        {esCorrectivo && (
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
        )}

        {esCorrectivo && informe.procesosRealizados && informe.procesosRealizados.length > 0 && (
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

        {informe.observaciones && informe.observaciones.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Observaciones ({informe.observaciones.length})
            </Text>
            
            {informe.observaciones.map((obs, index) => (
              <View 
                key={index}
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                  Observación {index + 1}
                </Text>
                <Text style={{ fontSize: 13, color: '#333', lineHeight: 18 }}>
                  {typeof obs === 'string' ? obs : obs.texto || obs}
                </Text>
              </View>
            ))}
          </View>
        )}

        {informe.evidencias && informe.evidencias.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Evidencias Fotográficas ({informe.evidencias.length})
            </Text>
            
            {informe.evidencias.map((evidencia, index) => (
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
                  Evidencia {index + 1}
                </Text>
                <Image
                  source={{ uri: evidencia.url }}
                  style={{ 
                    width: '100%', 
                    height: 200, 
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                  resizeMode="cover"
                />
                <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  {evidencia.descripcion}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[estilosComunes.boton, { backgroundColor: COLORES.primario, marginTop: 20, flexDirection: 'row' }]}
          onPress={exportarPDF}
        >
          <Ionicons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={estilosComunes.textoBoton}>
            Exportar a PDF
          </Text>
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