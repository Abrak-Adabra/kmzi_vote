export default class Error {
    public static async post(ip: string, body: { data: string; signature: string }) {
        const url = `https://${ip}:5000/error`
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
        })
        return response
    }
}
