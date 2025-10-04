import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

//Inico de sesion
import InicioSesion from '../interfaz/InicioSesion';

//Inicio mantenedor /Calendario/Formulario/Evidencia/Firma
import InicioMantenedor from '../interfaz/InicioMantenedor';
import PerfilMantenedor from '../interfaz/PerfilMantenedor';

import BuscarNombre from '../interfaz/BuscarNombre';
import InformesEquipo from '../interfaz/InformesEquipo';
//import QRScanner from '../interfaz/EscaneoQR';
//<Stack.Screen name="QRScanner" component={QRScanner} />

import Formulario  from '../interfaz/Formulario';
import Evidencia from '../interfaz/Evidencia';
import Firma from '../interfaz/Firma';
import InformeResumen from '../interfaz/InformeResumen';

//Inicio Admin /

import InicioAdmin from '../interfaz/InicioAdmin';
import { StackScreen } from 'react-native-screens';

const Stack = createNativeStackNavigator();

export default function NavegacionInicio() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="InicioSesion" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="InicioSesion" component={InicioSesion} />

        <Stack.Screen name="InicioMantenedor" component={InicioMantenedor} />
        <Stack.Screen name="PerfilMantenedor" component={PerfilMantenedor} />

        <Stack.Screen name="BuscarNombre" component={BuscarNombre} />
        <Stack.Screen name="InformesEquipo" component={InformesEquipo} />

        <Stack.Screen name="Formulario" component={Formulario} />
        <Stack.Screen name="Evidencia" component={Evidencia} />
        <Stack.Screen name="Firma" component={Firma} />
        <Stack.Screen name="InformeResumen" component={InformeResumen} />
        
        <Stack.Screen name="InicioAdmin" component={InicioAdmin} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
