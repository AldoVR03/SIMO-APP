const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.crearTrabajador = functions.https.onCall(async (data, context) => {
  console.log('🔍 Iniciando crearTrabajador');
  console.log('📦 Data recibida:', data);
  console.log('👤 Context.auth:', context.auth);

  // Verificar autenticación
  if (!context.auth) {
    console.error('❌ No hay context.auth');
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  console.log('✅ Usuario autenticado:', context.auth.uid);

  try {
    // Verificar que sea admin
    const userDoc = await admin.firestore().collection('usuarios').doc(context.auth.uid).get();
    
    console.log('📄 Documento del usuario existe:', userDoc.exists);
    
    if (!userDoc.exists) {
      console.error('❌ Usuario no encontrado en Firestore');
      throw new functions.https.HttpsError('not-found', 'Usuario no encontrado en la base de datos');
    }

    const userData = userDoc.data();
    console.log('👤 Datos del usuario:', userData);
    
    if (userData.rol !== 'admin') {
      console.error('❌ Usuario no es admin. Rol:', userData.rol);
      throw new functions.https.HttpsError(
        'permission-denied', 
        'No tienes permisos de administrador'
      );
    }

    const { nombre, rut, correo, contrasena } = data;

    // Validaciones
    if (!nombre || !rut || !correo || !contrasena) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Todos los campos son obligatorios'
      );
    }

    console.log('📝 Creando usuario en Auth...');

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: correo,
      password: contrasena,
      displayName: nombre,
    });

    console.log('✅ Usuario creado en Auth:', userRecord.uid);

    // Guardar datos en Firestore
    await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
      nombre: nombre,
      rut: rut,
      correo: correo,
      rol: 'mantenedor',
      habilitado: true,
      primerIngreso: true,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
      creadoPor: context.auth.uid
    });

    console.log('✅ Trabajador guardado en Firestore');

    return {
      success: true,
      uid: userRecord.uid,
      mensaje: 'Trabajador creado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error completo:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'Este correo electrónico ya está registrado'
      );
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});