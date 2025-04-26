export async function generateCryptKeyPair() {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-256',
            },
            false,
            ['encrypt', 'decrypt']
        )
        return keyPair
    } catch (error) {
        alert(`Ошибка при генерации ключа RSA для шифрования: ${error}`)
    }
}

export async function exportCryptKey(key: CryptoKey) {
    try {
        const exportedKey = await crypto.subtle.exportKey('spki', key)
        const preparedKey = btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
        return preparedKey
    } catch (error) {
        alert(`Ошибка при экспорте ключа для шифрования: ${error}`)
        return ''
    }
}

export async function encrypt(key: string, data: string) {
    try {
        const encryptKey = await crypto.subtle.importKey(
            'spki',
            new Uint8Array(Array.from(atob(key)).map((i) => i.charCodeAt(0))),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
            },
            true,
            ['encrypt']
        )
        let dataToEncrypt = Array.from(atob(data)).map((i) => i.charCodeAt(0))
        const arrayToEncrypt = []
        while (dataToEncrypt.length > 0) {
            arrayToEncrypt.push(dataToEncrypt.slice(0, 190))
            dataToEncrypt = dataToEncrypt.slice(190)
        }
        let encryptedData = [] as number[]
        for (const arrayElemToEncrypt of arrayToEncrypt) {
            const data = await crypto.subtle.encrypt(
                {
                    name: 'RSA-OAEP',
                },
                encryptKey,
                new Uint8Array(arrayElemToEncrypt)
            )
            encryptedData = encryptedData.concat(Array.from(new Uint8Array(data)))
        }
        return btoa(String.fromCharCode(...new Uint8Array(encryptedData)))
    } catch (error) {
        alert(`Ошибка при шифровании: ${error}`)
        return ''
    }
}

export async function decrypt(key: CryptoKey, data: string) {
    try {
        let dataToDecrypt = Array.from(atob(data)).map((i) => i.charCodeAt(0))
        const arrayToDecrypt = []
        while (dataToDecrypt.length > 0) {
            arrayToDecrypt.push(dataToDecrypt.slice(0, 256))
            dataToDecrypt = dataToDecrypt.slice(256)
        }
        let decryptedData = [] as number[]
        for (const arrayElemToDecrypt of arrayToDecrypt) {
            const data = await crypto.subtle.decrypt(
                {
                    name: 'RSA-OAEP',
                },
                key,
                new Uint8Array(arrayElemToDecrypt)
            )
            decryptedData = decryptedData.concat(Array.from(new Uint8Array(data)))
        }
        return btoa(String.fromCharCode(...new Uint8Array(decryptedData)))
    } catch (error) {
        alert(`Ошибка при дешифровании: ${error}`)
        return ''
    }
}
