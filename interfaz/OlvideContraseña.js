import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import estilos, { COLORES } from '../assets/estilos';
import { auth } from '../servicio/firebase-config';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function OlvideContrasena({ navigation }) {
    const [correo, setCorreo] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const validarEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const manejarRecuperacion = async () => {
        if (!correo.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
            return;
        }

        if (!validarEmail(correo)) {
            Alert.alert('Error', 'El formato del correo no es válido');
            return;
        }

        setEnviando(true);

        try {
            await sendPasswordResetEmail(auth, correo.trim().toLowerCase());
            setEnviado(true);
        } catch (error) {
            console.log('Error al enviar correo:', error.code);

            let mensajeError = 'No se pudo enviar el correo de recuperación';

            switch (error.code) {
                case 'auth/user-not-found':
                    // Por seguridad, mostramos el mismo mensaje de éxito
                    setEnviado(true);
                    return;
                case 'auth/invalid-email':
                    mensajeError = 'El formato del correo no es válido';
                    break;
                case 'auth/too-many-requests':
                    mensajeError = 'Demasiados intentos. Por favor espera unos minutos';
                    break;
                case 'auth/network-request-failed':
                    mensajeError = 'Error de conexión. Verifica tu internet';
                    break;
            }

            Alert.alert('Error', mensajeError);
        } finally {
            setEnviando(false);
        }
    };

    // Pantalla de éxito después de enviar el correo
    if (enviado) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#e8f5e9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 24,
                    }}>
                        <Ionicons name="mail-outline" size={40} color="#4caf50" />
                    </View>

                    <Text style={{
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: COLORES.texto,
                        marginBottom: 12,
                        textAlign: 'center',
                    }}>
                        ¡Correo enviado!
                    </Text>

                    <Text style={{
                        fontSize: 15,
                        color: '#666',
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 8,
                        paddingHorizontal: 20,
                    }}>
                        Si existe una cuenta asociada a{' '}
                        <Text style={{ fontWeight: '600', color: COLORES.texto }}>
                            {correo}
                        </Text>
                        , recibirás un enlace para restablecer tu contraseña.
                    </Text>

                    <Text style={{
                        fontSize: 13,
                        color: '#999',
                        textAlign: 'center',
                        marginBottom: 32,
                    }}>
                        Revisa también tu carpeta de spam
                    </Text>

                    <TouchableOpacity
                        style={[estilos.boton, { width: '100%' }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={estilos.textoBoton}>Volver al inicio de sesión</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ marginTop: 16 }}
                        onPress={() => {
                            setEnviado(false);
                            setCorreo('');
                        }}
                    >
                        <Text style={{ color: COLORES.enlace, fontSize: 14 }}>
                            Usar otro correo
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORES.fondo }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ padding: 8 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORES.texto} />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
                    {/* Icono */}
                    <View style={{
                        width: 70,
                        height: 70,
                        borderRadius: 35,
                        backgroundColor: '#fff3e0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 24,
                        alignSelf: 'center',
                    }}>
                        <Ionicons name="lock-open-outline" size={35} color={COLORES.primario} />
                    </View>

                    <Text style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: COLORES.texto,
                        textAlign: 'center',
                        marginBottom: 12,
                    }}>
                        ¿Olvidaste tu contraseña?
                    </Text>

                    <Text style={{
                        fontSize: 15,
                        color: '#666',
                        textAlign: 'center',
                        lineHeight: 22,
                        marginBottom: 32,
                    }}>
                        No te preocupes, ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </Text>

                    {/* Campo de correo */}
                    <Text style={estilos.etiqueta}>Correo electrónico</Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: '#e0e0e0',
                        marginBottom: 24,
                    }}>
                        <Ionicons name="mail-outline" size={20} color="#666" />
                        <TextInput
                            style={{
                                flex: 1,
                                paddingVertical: 14,
                                paddingHorizontal: 12,
                                fontSize: 15,
                                color: COLORES.texto,
                            }}
                            placeholder="nombre.apellido@ejemplo.com"
                            placeholderTextColor="#999"
                            value={correo}
                            onChangeText={setCorreo}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!enviando}
                            autoFocus
                        />
                        {correo.length > 0 && (
                            <TouchableOpacity onPress={() => setCorreo('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Botón enviar */}
                    <TouchableOpacity
                        style={[
                            estilos.boton,
                            (!correo.trim() || enviando) && { opacity: 0.6 }
                        ]}
                        onPress={manejarRecuperacion}
                        disabled={!correo.trim() || enviando}
                    >
                        {enviando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={estilos.textoBoton}>Enviar enlace de recuperación</Text>
                        )}
                    </TouchableOpacity>

                    {/* Link volver */}
                    <TouchableOpacity
                        style={{ marginTop: 20, alignItems: 'center' }}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={{ color: '#666', fontSize: 14 }}>
                            ¿Recordaste tu contraseña?{' '}
                            <Text style={{ color: COLORES.enlace, fontWeight: '600' }}>
                                Iniciar sesión
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}