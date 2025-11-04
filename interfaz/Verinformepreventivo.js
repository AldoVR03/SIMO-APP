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

export default function VerInformePreventivo({ route, navigation }) {
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

  const generarHTML = () => {
    // Obtener respuestas - manejar tanto array como objeto
    let respuestasArray = [];
    if (informe.respuestas) {
      if (Array.isArray(informe.respuestas)) {
        respuestasArray = informe.respuestas;
      } else {
        // Si es objeto, convertir a array
        respuestasArray = Object.values(informe.respuestas).filter(r => r && r.pregunta);
      }
    }

    // Generar tabla de pauta de mantención
    const tablaPautaHTML = respuestasArray.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 50%;">
              PAUTA DE MANTENCIÓN
            </th>
            <th style="border: 2px solid #000; padding: 8px; background: #f0f0f0; text-align: center; width: 15%;">
              SÍ
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
          ${respuestasArray.map(item => {
            const esSi = item.respuesta === 'Sí' || item.respuesta === 'Si';
            const esNo = item.respuesta === 'No';
            const esNA = item.respuesta === 'No aplica';
            
            // Manejar pregunta "Otros" con acciones
            let contenidoPregunta = item.pregunta || '';
            let filasExtra = '';
            
            if (item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && item.otros.length > 0) {
              filasExtra = item.otros.map(accion => {
                const accionSi = accion.respuesta === 'Sí' || accion.respuesta === 'Si';
                const accionNo = accion.respuesta === 'No';
                const accionNA = accion.respuesta === 'No aplica';
                return `
                  <tr>
                    <td style="border: 2px solid #000; padding: 8px; padding-left: 24px; font-size: 11px;">
                      • ${accion.accion}
                    </td>
                    <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${accionSi ? '#d4edda' : '#fff'};">
                      ${accionSi ? '✓' : ''}
                    </td>
                    <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${accionNo ? '#f8d7da' : '#fff'};">
                      ${accionNo ? '✓' : ''}
                    </td>
                    <td style="border: 2px solid #000; padding: 8px; text-align: center; background: ${accionNA ? '#e2e3e5' : '#fff'};">
                      ${accionNA ? '✓' : ''}
                    </td>
                  </tr>
                `;
              }).join('');
            }
            
            return `
              <tr>
                <td style="border: 2px solid #000; padding: 8px; font-size: 11px;">
                  ${contenidoPregunta}
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
              ${filasExtra}
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '';

    // Evidencias fotográficas
    const imagenes = informe.imagenes || [];
    const evidenciasHTML = imagenes.length > 0 ? `
      <div style="margin-top: 20px; page-break-before: always;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px;">
          EVIDENCIAS FOTOGRÁFICAS
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          ${imagenes.map((url, index) => `
            <div style="border: 1px solid #ddd; padding: 10px; text-align: center; page-break-inside: avoid;">
              <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 11px;">Evidencia ${index + 1}</p>
              <img src="${url}" style="width: 100%; max-height: 300px; object-fit: cover; border: 1px solid #ccc;" />
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    // Firmas
    const firmas = [];
    if (informe.firmas) {
      if (informe.firmas.firma_mantenedor) {
        firmas.push({
          tipo: 'Mantenedor',
          firma: informe.firmas.firma_mantenedor,
          nombre: informe.nombres?.nombre_mantenedor || 'N/A'
        });
      }
      if (informe.firmas.firma_supervisor) {
        firmas.push({
          tipo: 'Supervisor',
          firma: informe.firmas.firma_supervisor,
          nombre: informe.nombres?.nombre_supervisor || 'N/A'
        });
      }
      if (informe.firmas.firma_a_calidad_dgm) {
        firmas.push({
          tipo: 'A. Calidad DGM',
          firma: informe.firmas.firma_a_calidad_dgm,
          nombre: informe.nombres?.nombre_calidad || 'N/A'
        });
      }
    }

    const tablaFirmasHTML = firmas.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        ${firmas.map(firma => `
          <tr>
            <td style="border: 2px solid #000; padding: 8px; font-weight: bold; width: 30%; background: #f0f0f0;">
              ${firma.tipo.toUpperCase()}
            </td>
            <td style="border: 2px solid #000; padding: 8px;">
              <p style="margin: 0 0 5px 0; font-size: 12px;"><strong>${firma.nombre}</strong></p>
              ${firma.firma ? `<img src="${firma.firma}" style="max-width: 200px; max-height: 80px;" />` : 'Sin firma'}
            </td>
          </tr>
        `).join('')}
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
            }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 2px solid #000; padding: 6px; }
            .header-cell { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="titulo-principal">
            INFORME PREVENTIVO
            <br/>
            ${informe.nombreEquipo || informe.equipo || 'EQUIPO'}
            <br/>
            <span style="font-size: 12px;">${informe.codigoSGS || informe.codigo_sgs || ''}</span>
          </div>

          <table style="margin-top: 10px;">
            <tr>
              <td class="header-cell" style="width: 25%;">Código SGS</td>
              <td style="width: 25%;">${informe.codigoSGS || informe.codigo_sgs || 'N/A'}</td>
              <td class="header-cell" style="width: 25%;">Fecha</td>
              <td style="width: 25%;">${formatearFecha(informe.fecha)}</td>
            </tr>
            <tr>
              <td class="header-cell">Marca</td>
              <td>${informe.marca || 'N/A'}</td>
              <td class="header-cell">Modelo</td>
              <td>${informe.modelo || 'N/A'}</td>
            </tr>
            <tr>
              <td class="header-cell">N° Serie</td>
              <td colspan="3">${informe.numeroSerie || informe.numero_serie || 'N/A'}</td>
            </tr>
          </table>

          ${tablaPautaHTML}
          ${tablaFirmasHTML}
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

  // Obtener respuestas
  let respuestasArray = [];
  if (informe.respuestas) {
    if (Array.isArray(informe.respuestas)) {
      respuestasArray = informe.respuestas;
    } else {
      respuestasArray = Object.values(informe.respuestas).filter(r => r && r.pregunta);
    }
  }

  const imagenes = informe.imagenes || [];
  const firmas = [];
  if (informe.firmas) {
    if (informe.firmas.firma_mantenedor) {
      firmas.push({
        tipo: 'Mantenedor',
        firma: informe.firmas.firma_mantenedor,
        nombre: informe.nombres?.nombre_mantenedor || 'N/A'
      });
    }
    if (informe.firmas.firma_supervisor) {
      firmas.push({
        tipo: 'Supervisor',
        firma: informe.firmas.firma_supervisor,
        nombre: informe.nombres?.nombre_supervisor || 'N/A'
      });
    }
    if (informe.firmas.firma_a_calidad_dgm) {
      firmas.push({
        tipo: 'A. Calidad DGM',
        firma: informe.firmas.firma_a_calidad_dgm,
        nombre: informe.nombres?.nombre_calidad || 'N/A'
      });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0 }]}>Informe Preventivo</Text>
        <TouchableOpacity onPress={exportarPDF} style={{ padding: 8 }}>
          <Ionicons name="download" size={24} color={COLORES.primario} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{
          backgroundColor: '#3498db',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            INFORME PREVENTIVO
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
            <Text style={styles.etiquetaCampo}>Marca:</Text>
            <Text style={styles.valorCampo}>{informe.marca || 'N/A'}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Modelo:</Text>
            <Text style={styles.valorCampo}>{informe.modelo || 'N/A'}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>N° de Serie:</Text>
            <Text style={styles.valorCampo}>{informe.numeroSerie || informe.numero_serie || 'N/A'}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiquetaCampo}>Fecha:</Text>
            <Text style={styles.valorCampo}>{formatearFecha(informe.fecha)}</Text>
          </View>
        </View>

        {respuestasArray.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Pauta de Mantención ({respuestasArray.length})
            </Text>
            {respuestasArray.map((item, index) => (
              <View key={index}>
                <View style={{
                  backgroundColor: '#f8f9fa',
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: obtenerColorRespuesta(item.respuesta),
                }}>
                  <Text style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                    Ítem {index + 1}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#333', marginBottom: 6 }}>
                    {item.pregunta}
                  </Text>
                  <View style={{
                    alignSelf: 'flex-start',
                    backgroundColor: obtenerColorRespuesta(item.respuesta),
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                      {item.respuesta}
                    </Text>
                  </View>
                </View>
                
                {/* Mostrar acciones de "Otros" */}
                {item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && item.otros.length > 0 && (
                  <View style={{ marginLeft: 16, marginBottom: 8 }}>
                    {item.otros.map((accion, idx) => (
                      <View key={idx} style={{
                        backgroundColor: '#fff',
                        padding: 10,
                        borderRadius: 6,
                        marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: obtenerColorRespuesta(accion.respuesta),
                        borderWidth: 1,
                        borderColor: '#e0e0e0',
                      }}>
                        <Text style={{ fontSize: 13, color: '#333', marginBottom: 4 }}>
                          • {accion.accion}
                        </Text>
                        <View style={{
                          alignSelf: 'flex-start',
                          backgroundColor: obtenerColorRespuesta(accion.respuesta),
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                            {accion.respuesta}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {imagenes.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>
              Evidencias Fotográficas ({imagenes.length})
            </Text>
            {imagenes.map((url, index) => (
              <View key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: 12,
                borderRadius: 6,
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                  Evidencia {index + 1}
                </Text>
                <Image
                  source={{ uri: url }}
                  style={{ width: '100%', height: 200, borderRadius: 6 }}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>
        )}

        {firmas.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Firmas ({firmas.length})</Text>
            {firmas.map((firma, index) => (
              <View key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: 12,
                borderRadius: 6,
                marginBottom: 12,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                  {firma.tipo}
                </Text>
                <Image
                  source={{ uri: firma.firma }}
                  style={{ width: 250, height: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, marginBottom: 8 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 12, color: '#666' }}>{firma.nombre}</Text>
              </View>
            ))}
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