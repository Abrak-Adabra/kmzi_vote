export default class Bulletin {
    public static async post(ip: string, body: { id: string; data: string; signature: string }) {
        const url = `https://${ip}:5000/bulletin`
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        })
        return (await response.ok) ? await response.text() : ((await response.json()) as { error: string }).error
    }
    public static async put(ip: string, body: { id: string; data: string; signature: string }) {
        const url = `https://${ip}:5000/bulletin`
        const response = await fetch(url, {
            method: 'PUT',
            body: JSON.stringify(body),
        })
        return (await response.ok) ? await response.text() : ((await response.json()) as { error: string }).error
    }
    public static async get(ip: string) {
        const url = `https://${ip}:5000/bulletin`
        const response = await fetch(url, {
            method: 'GET',
        })
        return (await response.ok) ? await response.text() : ((await response.json()) as { error: string }).error
    }
}
