const FIREBASE_URL = 'https://proyectojavascriptacme-default-rtdb.firebaseio.com';

class DataManager {
    constructor() {
        this.baseUrl = FIREBASE_URL;
        console.log('[DataManager] Inicializado con URL:', this.baseUrl);
    }


    _url(node) {
        return `${this.baseUrl}/${node}.json`;
    }

    _handleError(error, context) {
        console.error(`[DataManager] Error en ${context}:`, error);
        throw error;
    }


    /**
     * @param {string} node 
     * @returns {Promise<Array>} 
     */
    async obtenerTodos(node) {
        try {
            console.log(`[DataManager] GET /${node}`);
            const res = await fetch(this._url(node));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data) return [];
            const array = Object.entries(data).map(([key, val]) => ({
                _firebaseKey: key,
                ...val
            }));
            console.log(`[DataManager] GET /${node} => ${array.length} registros`);
            return array;
        } catch (err) {
            this._handleError(err, `obtenerTodos(${node})`);
        }
    }

    /**
     * @param {string} node - nombre del nodo
     * @returns {Promise<Object|null>}
     */
    async obtenerRaw(node) {
        try {
            console.log(`[DataManager] GET (raw) /${node}`);
            const res = await fetch(this._url(node));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] GET (raw) /${node} =>`, data ? 'con datos' : 'vacío');
            return data || {};
        } catch (err) {
            this._handleError(err, `obtenerRaw(${node})`);
        }
    }

    /**
     * Firebase con PUT reemplaza todo el nodo
     * @param {string} node 
     * @param {Array} array 
     */
    async guardarArray(node, array) {
        try {
            console.log(`[DataManager] PUT /${node} => ${array.length} registros`);
            const objetoIndexado = {};
            array.forEach((item, index) => {
                const key = item._firebaseKey || `item_${index}`;
                const { _firebaseKey, ...sinKey } = item;
                objetoIndexado[key] = sinKey;
            });

            const res = await fetch(this._url(node), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(objetoIndexado)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] PUT /${node} OK`);
            return data;
        } catch (err) {
            this._handleError(err, `guardarArray(${node})`);
        }
    }

    /**
     * Genera una key automatica de Firebase
     * @param {string} node 
     * @param {Object} item 
     * @returns {Promise<string>} 
     */
    async agregarItem(node, item) {
        try {
            console.log(`[DataManager] POST /${node}`, item);
            const res = await fetch(this._url(node), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] POST /${node} OK, key:`, data.name);
            return data.name;
        } catch (err) {
            this._handleError(err, `agregarItem(${node})`);
        }
    }

    /**
     * @param {string} node 
     * @param {string} key 
     * @param {Object} datos 
     */
    async actualizarItem(node, key, datos) {
        try {
            console.log(`[DataManager] PATCH /${node}/${key}`, datos);
            const res = await fetch(`${this.baseUrl}/${node}/${key}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log(`[DataManager] PATCH /${node}/${key} OK`);
            return data;
        } catch (err) {
            this._handleError(err, `actualizarItem(${node}, ${key})`);
        }
    }

    /**
     * @param {string} node 
     * @param {string} key 
     */
    async eliminarItem(node, key) {
        try {
            console.log(`[DataManager] DELETE /${node}/${key}`);
            const res = await fetch(`${this.baseUrl}/${node}/${key}.json`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log(`[DataManager] DELETE /${node}/${key} OK`);
            return true;
        } catch (err) {
            this._handleError(err, `eliminarItem(${node}, ${key})`);
        }
    }


    async obtenerUsuarios() {
        return await this.obtenerTodos('usuarios');
    }

    async guardarUsuarios(usuarios) {
        return await this.guardarArray('usuarios', usuarios);
    }

    async crearUsuario(usuario) {
        return await this.agregarItem('usuarios', usuario);
    }

    async actualizarUsuario(key, datos) {
        return await this.actualizarItem('usuarios', key, datos);
    }

    async eliminarUsuario(key) {
        return await this.eliminarItem('usuarios', key);
    }

    async obtenerInventario() {
        return await this.obtenerTodos('inventario');
    }

    async obtenerInventarioRaw() {
        return await this.obtenerRaw('inventario');
    }

    async guardarInventario(inventario) {
        return await this.guardarArray('inventario', inventario);
    }

    async crearProducto(producto) {
        return await this.agregarItem('inventario', producto);
    }

    async actualizarProducto(key, datos) {
        return await this.actualizarItem('inventario', key, datos);
    }

    async eliminarProducto(key) {
        return await this.eliminarItem('inventario', key);
    }

    // --- Produccion ---
    async obtenerProduccion() {
        return await this.obtenerTodos('produccion');
    }

    async obtenerProduccionRaw() {
        return await this.obtenerRaw('produccion');
    }

    async guardarProduccion(produccion) {
        return await this.guardarArray('produccion', produccion);
    }

    async crearRegistroProduccion(registro) {
        return await this.agregarItem('produccion', registro);
    }

   
    async obtenerSiguienteConsecutivo() {
        try {
            const registros = await this.obtenerProduccion();
            if (registros.length === 0) return 1;
            const max = Math.max(...registros.map(r => parseInt(r.codigo) || 0));
            return max + 1;
        } catch (err) {
            console.warn('[DataManager] Error obteniendo consecutivo, usando 1:', err);
            return 1;
        }
    }

    /**
     * @param {Object} params - { inventarioActualizado, registroProduccion }
     */
    async ejecutarProduccion({ inventarioActualizado, registroProduccion }) {
        console.log('[DataManager] Ejecutando produccion completa...');
        try {
            await this.guardarInventario(inventarioActualizado);
            console.log('[DataManager] Inventario actualizado OK');

            const key = await this.crearRegistroProduccion(registroProduccion);
            console.log('[DataManager] Registro de produccion creado, key:', key);

            return { ok: true, produccionKey: key };
        } catch (err) {
            this._handleError(err, 'ejecutarProduccion');
        }
    }

    async obtenerMermas() {
        return await this.obtenerTodos('mermas');
    }

    async crearMerma(registro) {
        return await this.agregarItem('mermas', registro);
    }

    /**
     * @param {Object} params 
     */
    async ejecutarMerma({ inventarioActualizado, registroMerma }) {
        console.log('[DataManager] Registrando merma...');
        try {
            await this.guardarInventario(inventarioActualizado);
            const key = await this.crearMerma(registroMerma);
            console.log('[DataManager] Merma registrada, key:', key);
            return { ok: true, mermaKey: key };
        } catch (err) {
            this._handleError(err, 'ejecutarMerma');
        }
    }
}

export const dataManager = new DataManager();
export default dataManager;
