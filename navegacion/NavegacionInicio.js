import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

//Inico de sesion
import InicioSesion from '../interfaz/InicioSesion';

//Inicio mantenedor /Calendario/Formulario/Evidencia/Firma/Resumen/
import InicioMantenedor from '../interfaz/InicioMantenedor';
import PerfilMantenedor from '../interfaz/PerfilMantenedor';
import CompletarFirmas from '../interfaz/CompletarFirmas';
import CambioContrasena from '../interfaz/CambioContrasena';

import BuscarNombre from '../interfaz/BuscarNombre';
import EscaneoQR from '../interfaz/EscaneoQR';
import InformesEquipo from '../interfaz/InformesEquipo';
import VerInformeCorrectivo from '../interfaz/Verinformecorrectivo';
import VerInformePreventivo from '../interfaz/Verinformepreventivo';

import InformeCorrectivo from '../interfaz/InformeCorrectivo'
import ProcesosCorrectivo from '../interfaz/ProcesosCorrectivo';
import ObservacionesCorrectivo from '../interfaz/ObservacionesCorrectivo';
import EvidenciasCorrectivo from '../interfaz/EvidenciasCorrectivo';
import ResumenCorrectivo from '../interfaz/ResumenCorrectivo';

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
        <Stack.Screen name="CompletarFirmas" component={CompletarFirmas} />
        <Stack.Screen name="CambioContrasena" component={CambioContrasena} />

        <Stack.Screen name="BuscarNombre" component={BuscarNombre} />
        <Stack.Screen name="InformesEquipo" component={InformesEquipo} />
        <Stack.Screen name="EscaneoQR" component={EscaneoQR} />
        <Stack.Screen name="InformeCorrectivo" component={InformeCorrectivo} />
        <Stack.Screen name="ProcesosCorrectivo" component={ProcesosCorrectivo} />
        <Stack.Screen name="ObservacionesCorrectivo" component={ObservacionesCorrectivo} />
        <Stack.Screen name="EvidenciasCorrectivo" component={EvidenciasCorrectivo} />
        <Stack.Screen name="ResumenCorrectivo" component={ResumenCorrectivo} />
        <Stack.Screen name="VerInformeCorrectivo" component={VerInformeCorrectivo} />
        <Stack.Screen name="VerInformePreventivo" component={VerInformePreventivo} />

        <Stack.Screen name="Formulario" component={Formulario} />
        <Stack.Screen name="Evidencia" component={Evidencia} />
        <Stack.Screen name="Firma" component={Firma} />
        <Stack.Screen name="InformeResumen" component={InformeResumen} />
        
        <Stack.Screen name="InicioAdmin" component={InicioAdmin} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
