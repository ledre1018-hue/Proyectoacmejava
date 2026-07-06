import { dataManager } from '../data/dataManager.js';

console.log('[Production] Modulo de produccion cargado');

/**
 * @param {Object} producto 
 * @param {number} cantidad 
 * @param {Array} inventario 
 * @returns {Object} 
 */
export function validarStockProduccion(producto, cantidad, inventario) {
    const faltantes = [];

    if (!producto.formula || producto.formula.length === 0) {
        faltantes.push('El producto no tiene formula definida');
        return { puedeProducir: false, faltantes };
    }

    for (const ingrediente of producto.formula) {
        const mp = inventario.find(p => p.codigo === ingrediente.codigoMP);
        if (!mp) {
            faltantes.push(`Materia prima "${ingrediente.codigoMP}" no existe en inventario`);
            continue;
        }
        const stockActual = parseFloat(mp.stock) || 0;
        const requerido = ingrediente.cantidad * cantidad;
        if (stockActual < requerido) {
            faltantes.push(`${mp.nombre}: necesita ${requerido}, solo hay ${stockActual}`);
        }
    }

    return {
        puedeProducir: faltantes.length === 0,
        faltantes
    };
}

/**
 * @param {Object} producto 
 * @param {number} cantidad 
 * @param {Array} inventario 
 * @returns {Object}
 */
export function calcularProduccion(producto, cantidad, inventario) {
    const inventarioActualizado = inventario.map(p => ({ ...p }));
    const materiaConsumida = [];

    for (const ingrediente of producto.formula) {
        const idx = inventarioActualizado.findIndex(p => p.codigo === ingrediente.codigoMP);
        if (idx !== -1) {
            const mp = inventarioActualizado[idx];
            const consumo = ingrediente.cantidad * cantidad;
            const stockAnterior = parseFloat(mp.stock) || 0;
            const nuevoStock = stockAnterior - consumo;
            inventarioActualizado[idx] = { ...mp, stock: nuevoStock };
            materiaConsumida.push({
                codigo: mp.codigo,
                nombre: mp.nombre,
                cantidad: consumo,
                stockAnterior,
                stockNuevo: nuevoStock
            });
        }
    }

    const idxPT = inventarioActualizado.findIndex(p => p._firebaseKey === producto._firebaseKey);
    let stockAnteriorPT = 0;
    let stockNuevoPT = cantidad;
    if (idxPT !== -1) {
        const pt = inventarioActualizado[idxPT];
        stockAnteriorPT = parseFloat(pt.stock) || 0;
        stockNuevoPT = stockAnteriorPT + cantidad;
        inventarioActualizado[idxPT] = { ...pt, stock: stockNuevoPT };
    }

    return { inventarioActualizado, materiaConsumida, stockAnteriorPT, stockNuevoPT };
}

/**
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
export async function ejecutarProduccionCompleta({ productoKey, cantidad, inventario }) {
    console.log(`[Production] Ejecutando produccion: ${cantidad} x ${productoKey}`);

    const producto = inventario.find(p => p._firebaseKey === productoKey);
    if (!producto) throw new Error('Producto no encontrado');

    const validacion = validarStockProduccion(producto, cantidad, inventario);
    if (!validacion.puedeProducir) {
        throw new Error('Stock insuficiente: ' + validacion.faltantes.join(', '));
    }

    const calculo = calcularProduccion(producto, cantidad, inventario);

    const consecutivo = await dataManager.obtenerSiguienteConsecutivo();

    const registroProduccion = {
        codigo: consecutivo.toString(),
        productoKey,
        codigoProducto: producto.codigo,
        nombreProducto: producto.nombre,
        cantidadProducida: cantidad,
        materiaPrimaConsumida: calculo.materiaConsumida,
        fecha: new Date().toISOString(),
        timestamp: Date.now()
    };

    const resultado = await dataManager.ejecutarProduccion({
        inventarioActualizado: calculo.inventarioActualizado,
        registroProduccion
    });

    console.log('[Production] Produccion completada #', consecutivo);

    return {
        ...resultado,
        consecutivo,
        producto: producto.nombre,
        cantidad,
        materiaConsumida: calculo.materiaConsumida
    };
}

/**
 * @returns {Promise<Array>}
 */
export async function obtenerHistorialProduccion() {
    const registros = await dataManager.obtenerProduccion();
    return registros.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}
