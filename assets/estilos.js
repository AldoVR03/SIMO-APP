import { StyleSheet } from 'react-native';

export const COLORES = {
  primario: '#ff9900', 
  fondo: '#fff',
  texto: '#333',
  enlace: '#2e4fff',
  borde: '#444',
};

const estilosComunes = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.fondo,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 16,
    marginTop: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    color: COLORES.texto,
  },
  etiqueta: {
    alignSelf: 'flex-start',
    marginLeft: 5,
    marginBottom: 5,
    fontSize: 14,
    color: COLORES.texto,
  },
  entrada: {
    width: '100%',
    height: 44,
    borderColor: COLORES.borde,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  boton: {
    width: '100%',
    height: 44,
    backgroundColor: COLORES.primario,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 12,
  },
  textoBoton: {
    color: '#fff',
    fontWeight: 'bold',
  },
  olvido: {
    color: COLORES.enlace,
    textDecorationLine: 'underline',
  },
   contenedor: { flex: 1, padding: 16, backgroundColor: COLORES.fondo },

  // Header
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoTexto: { fontSize: 18, fontWeight: 'bold', color: COLORES.texto },

  // Semana
  semanaEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  mesTexto: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' },
  semana: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: { alignItems: 'center', padding: 6, flex: 1 },
  diaSeleccionado: { backgroundColor: '#ffeacc', borderRadius: 6 },
  textoDia: { fontSize: 12, color: COLORES.texto },
  numeroDia: { fontSize: 16, fontWeight: 'bold' },

  // Filtros
  botonesFiltro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  filtro: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  textoFiltro: { fontWeight: 'bold' },

  // Botonera
  botonera: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: COLORES.borde,
  },
  botonIcono: { alignItems: 'center', flex: 1 },
  textoBotonIcono: {
    fontSize: 12,
    color: COLORES.primario,
    marginTop: 4,
  },

  // Resumen
  resumen: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  tituloResumen: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  botonIniciar: {
    marginTop: 10,
    backgroundColor: '#3b44c3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  textoBotonIniciar: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // ... otros estilos ...

tarjetaInforme: {
    // Estilos generales de la tarjeta, el color del borde ahora es dinámico
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
},
tarjetaContenido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
},
tituloTarjeta: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    flexShrink: 1, // Permite que el texto se ajuste
    marginRight: 10,
},
tarjetaEstado: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 100, // Ancho mínimo para que todos se vean similares
    alignItems: 'center',
},
// ... otros estilos ...
});

export default estilosComunes;
