export async function generateSignKeyPair() {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-PSS',
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: 'SHA-256',
            },
            false,
            ['sign', 'verify']
        )
        return keyPair
    } catch (error) {
        console.error('Ошибка при генерации ключа RSA для подписи:', error)
        throw error
    }
}

export async function exportSignKey(key: CryptoKey) {
    try {
        const exportedKey = await crypto.subtle.exportKey('spki', key)
        const preparedKey = btoa(String.fromCharCode(...new Uint8Array(exportedKey)))
        return preparedKey
    } catch (error) {
        alert(`Ошибка при экспорте ключа для подписи: ${error}`)
    }
}

export async function sign(secretKey: CryptoKey, data: string) {
    try {
        const signature = await crypto.subtle.sign(
            {
                hash: 'SHA-256',
                name: 'RSA-PSS',
                saltLength: 32,
            },
            secretKey,
            new TextEncoder().encode(data)
        )
        return btoa(String.fromCharCode(...new Uint8Array(signature)))
    } catch (error) {
        console.error('Ошибка во время подписания:', error)
        throw error
    }
}

async function importSignKey(publicKey: string) {
    try {
        return await crypto.subtle.importKey(
            'spki',
            new Uint8Array(Array.from(atob(publicKey)).map((i) => i.charCodeAt(0))),
            {
                name: 'RSA-PSS',
                hash: 'SHA-256',
            },
            true,
            ['verify']
        )
    } catch (error) {
        console.error('Ошибка во время импорта подписи:', error)
        throw error
    }
}

export async function verify(publicKey: string, signature: string, data: string) {
    try {
        const isValid = await crypto.subtle.verify(
            {
                hash: 'SHA-256',
                name: 'RSA-PSS',
                saltLength: 32,
            },
            await importSignKey(publicKey),
            new Uint8Array(Array.from(atob(signature)).map((i) => i.charCodeAt(0))),
            new TextEncoder().encode(data)
        )
        return isValid
    } catch (error) {
        console.error('Ошибка во время проверки подписи:', error)
        throw error
    }
}
