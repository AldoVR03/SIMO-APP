import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import estilosComunes, { COLORES } from '../assets/estilos';

const FilaDato = ({ label, valor }) => (
  <View style={estilos.fila}>
    <Text style={estilos.etiquetaCampo}>{label}</Text>
    <Text style={estilos.valorCampo}>{valor || 'N/A'}</Text>
  </View>
);

export default function VerInformePreventivo() {
  const navigation = useNavigation();
  const route = useRoute();
  const { informe } = route.params;
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const imagenes = informe.evidencias || informe.imagenes || [];

  let respuestasArray = [];
  if (informe.respuestas) {
    if (Array.isArray(informe.respuestas)) {
      respuestasArray = informe.respuestas;
    } else {
      respuestasArray = Object.values(informe.respuestas).filter(r => r && r.pregunta);
    }
  }

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

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    if (fecha.seconds) {
      return new Date(fecha.seconds * 1000).toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    if (fecha.toDate) return fecha.toDate().toLocaleDateString('es-CL');
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const obtenerColorRespuesta = (respuesta) => {
    switch (respuesta) {
      case 'Sí': case 'Si': return '#27ae60';
      case 'No': return '#e74c3c';
      case 'No aplica': return '#95a5a6';
      default: return '#000';
    }
  };

  const generarHTML = () => {
    const tablaPautaHTML = respuestasArray.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 5px; background: #eee; text-align: left; width: 50%;">PAUTA DE MANTENCIÓN</th>
            <th style="border: 1px solid #000; padding: 5px; background: #eee; width: 15%; text-align: center;">SÍ</th>
            <th style="border: 1px solid #000; padding: 5px; background: #eee; width: 15%; text-align: center;">NO</th>
            <th style="border: 1px solid #000; padding: 5px; background: #eee; width: 20%; text-align: center;">N/A</th>
          </tr>
        </thead>
        <tbody>
          ${respuestasArray.map(item => {
      const esSi = item.respuesta === 'Sí' || item.respuesta === 'Si';
      const esNo = item.respuesta === 'No';
      const esNA = item.respuesta === 'No aplica';

      let filasExtra = '';
      if (item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && item.otros.length > 0) {
        filasExtra = item.otros.map(accion => {
          const aSi = accion.respuesta === 'Sí' || accion.respuesta === 'Si';
          const aNo = accion.respuesta === 'No';
          const aNA = accion.respuesta === 'No aplica';
          return `
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px 4px 4px 20px; font-size: 10px;">• ${accion.accion}</td>
                    <td style="border: 1px solid #000; text-align: center; background: ${aSi ? '#d4edda' : '#fff'};">${aSi ? 'X' : ''}</td>
                    <td style="border: 1px solid #000; text-align: center; background: ${aNo ? '#f8d7da' : '#fff'};">${aNo ? 'X' : ''}</td>
                    <td style="border: 1px solid #000; text-align: center; background: ${aNA ? '#e2e3e5' : '#fff'};">${aNA ? 'X' : ''}</td>
                  </tr>`;
        }).join('');
      }

      return `
              <tr>
                <td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${item.pregunta}</td>
                <td style="border: 1px solid #000; text-align: center; background: ${esSi ? '#d4edda' : '#fff'};">${esSi ? 'X' : ''}</td>
                <td style="border: 1px solid #000; text-align: center; background: ${esNo ? '#f8d7da' : '#fff'};">${esNo ? 'X' : ''}</td>
                <td style="border: 1px solid #000; text-align: center; background: ${esNA ? '#e2e3e5' : '#fff'};">${esNA ? 'X' : ''}</td>
              </tr>
              ${filasExtra}
            `;
    }).join('')}
        </tbody>
      </table>
    ` : '';

    const evidenciasHTML = imagenes.length > 0 ? `
      <div style="margin-top: 20px; page-break-before: always;">
        <h3 style="border-bottom: 2px solid #000; padding-bottom: 5px;">EVIDENCIAS FOTOGRÁFICAS</h3>
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
          ${imagenes.map((url, index) => `
            <div style="width: 48%; margin-bottom: 15px; border: 1px solid #ccc; padding: 5px;">
              <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 10px;">Evidencia ${index + 1}</p>
              <img src="${url}" style="width: 100%; height: 200px; object-fit: contain;" />
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const tablaFirmasHTML = firmas.length > 0 ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <tr>
          ${firmas.map(f => `
            <td style="border: 0; padding: 10px; text-align: center; vertical-align: bottom;">
              ${f.firma ? `<img src="${f.firma}" style="height: 60px; max-width: 100%;" />` : ''}
              <div style="border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; font-size: 10px;">
                <strong>${f.nombre}</strong><br/>
                ${f.tipo}
              </div>
            </td>
          `).join('')}
        </tr>
      </table>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            .header { border: 2px solid #000; padding: 10px; text-align: center; margin-bottom: 15px; }
            .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .info-grid td { border: 1px solid #000; padding: 5px; }
            .label { background-color: #f0f0f0; font-weight: bold; width: 25%; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">INFORME PREVENTIVO</h2>
            <p style="margin: 5px 0 0 0;">${informe.equipo || 'EQUIPO'}</p>
            <span style="font-size: 10px;">${informe.codigo_sgs || informe.codigoSGS || ''}</span>
          </div>

          <table class="info-grid">
            <tr>
              <td class="label">Código SGS</td>
              <td>${informe.codigo_sgs || informe.codigoSGS || 'N/A'}</td>
              <td class="label">Fecha</td>
              <td>${formatearFecha(informe.fecha)}</td>
            </tr>
            <tr>
              <td class="label">Marca</td>
              <td>${informe.marca || 'N/A'}</td>
              <td class="label">Modelo</td>
              <td>${informe.modelo || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">N° Serie</td>
              <td colspan="3">${informe.numero_serie || informe.numeroSerie || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Usuario</td>
              <td colspan="3">${informe.usuario || 'N/A'}</td>
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
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (generandoPDF) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={{ marginTop: 20 }}>Generando PDF...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
      <View style={estilosComunes.encabezado}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
        </TouchableOpacity>
        <Text style={[estilosComunes.titulo, { margin: 0, fontSize: 18 }]}>Detalle Informe</Text>
        <TouchableOpacity onPress={exportarPDF} style={{ padding: 8 }}>
          <Ionicons name="download-outline" size={24} color={COLORES.primario} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>

        <View style={{ backgroundColor: '#2980b9', padding: 16, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
            {informe.equipo || 'EQUIPO SIN NOMBRE'}
          </Text>
          <Text style={{ color: '#ecf0f1', marginTop: 4 }}>
            {informe.codigo_sgs || informe.codigoSGS}
          </Text>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Datos Generales</Text>
          <FilaDato label="Código SGS" valor={informe.codigo_sgs || informe.codigoSGS} />
          <FilaDato label="Marca" valor={informe.marca} />
          <FilaDato label="Modelo" valor={informe.modelo} />
          <FilaDato label="N° Serie" valor={informe.numero_serie || informe.numeroSerie} />
          <FilaDato label="Fecha" valor={formatearFecha(informe.fecha)} />
          <FilaDato label="Estado" valor={informe.estado} />
        </View>

        {respuestasArray.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Pauta de Mantención</Text>
            {respuestasArray.map((item, index) => (
              <View key={index} style={estilos.itemPauta}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>{item.pregunta}</Text>
                  <View style={[estilos.badge, { backgroundColor: obtenerColorRespuesta(item.respuesta) }]}>
                    <Text style={estilos.badgeText}>{item.respuesta}</Text>
                  </View>
                </View>

                {item.pregunta === 'Otros' && item.otros && Array.isArray(item.otros) && (
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

        {imagenes.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Evidencias Fotográficas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imagenes.map((img, index) => (
                <View key={index} style={estilos.contenedorImagen}>
                  <Image source={{ uri: img }} style={{ width: 200, height: 200, borderRadius: 8 }} resizeMode="cover" />
                  <Text style={estilos.labelImagen}>Evidencia {index + 1}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {firmas.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>Firmas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {firmas.map((f, index) => (
                <View key={index} style={estilos.contenedorFirma}>
                  <Text style={estilos.tipoFirma}>{f.tipo}</Text>
                  {f.firma ? (
                    <Image source={{ uri: f.firma }} style={{ width: '100%', height: 60, resizeMode: 'contain' }} />
                  ) : (
                    <Text style={{ fontStyle: 'italic', color: '#999' }}>Sin firma</Text>
                  )}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#eee', width: '100%', marginTop: 5, paddingTop: 5 }}>
                    <Text style={estilos.nombreFirma}>{f.nombre}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
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
    borderBottomColor: '#eee',
  },
  fila: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
    paddingBottom: 4,
  },
  etiquetaCampo: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  valorCampo: {
    flex: 1.5,
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
  },
  itemPauta: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  contenedorImagen: {
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 5,
  },
  labelImagen: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  contenedorFirma: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tipoFirma: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  nombreFirma: {
    fontSize: 10,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  }
});