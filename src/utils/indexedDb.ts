class DB {
    private db: IDBDatabase | undefined

    constructor() {
        if (typeof indexedDB == 'undefined') return
        const openRequest = indexedDB.open('kmzi_vote')
        const createDb: Promise<IDBDatabase> = new Promise((resolve) => {
            openRequest.onupgradeneeded = function () {
                openRequest.result.createObjectStore('keyPairs', { keyPath: 'id' })
                openRequest.result.createObjectStore('temp', { keyPath: 'id' })
            }
            openRequest.onsuccess = function () {
                resolve(openRequest.result)
            }
        })
        Promise.resolve(createDb).then((db) => (this.db = db))
    }

    private transaction() {
        return this.db?.transaction(['keyPairs', 'temp'], 'readwrite')
    }

    addKeys(id: string, cryptKeys: CryptoKeyPair, signKeys: CryptoKeyPair) {
        this.transaction()?.objectStore('keyPairs').add({ id, crypt: cryptKeys, sign: signKeys })
    }

    async getPrivateKey(id: string, mode: 'crypt' | 'sign') {
        return await Promise.resolve(
            new Promise<CryptoKey>((resolve) => {
                const request = this.transaction()?.objectStore('keyPairs').get(id)
                if (request) {
                    request.onsuccess = () => {
                        resolve(request.result[mode].privateKey)
                    }
                }
            })
        )
    }

    async getPublicKey(id: string, mode: 'crypt' | 'sign') {
        return await Promise.resolve(
            new Promise<CryptoKey>((resolve) => {
                const request = this.transaction()?.objectStore('keyPairs').get(id)
                if (request) {
                    request.onsuccess = () => {
                        resolve(request.result[mode].publicKey)
                    }
                }
            })
        )
    }

    async getCurrent() {
        return await Promise.resolve(
            new Promise<string[]>((resolve) => {
                const request = this.transaction()?.objectStore('keyPairs').getAllKeys() as IDBRequest<string[]>
                if (request) {
                    request.onsuccess = () => {
                        resolve(request.result.sort((a, b) => Number(a) - Number(b)))
                    }
                }
            })
        )
    }

    clear_keys() {
        this.transaction()?.objectStore('keyPairs').delete(IDBKeyRange.lowerBound(0))
    }

    addTemp(id: string, data: string[]) {
        this.transaction()?.objectStore('temp').put({ id, data })
    }

    async getTemp(id: string) {
        return new Promise<string[]>((resolve) => {
            const request = this.transaction()?.objectStore('temp').get(id) as IDBRequest<{ data: string[] }>
            if (request) {
                request.onsuccess = () => {
                    if (request.result === undefined) alert('нет данных о шифровании')
                    else resolve(request.result.data)
                }
            }
        })
    }
}
const db = new DB()
export default db
