export default class Users {
    public static async add(ip: string, data: { pck: string; psk: string }) {
        const url = `https://${ip}:5000/users/add`

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
        })
        return await response.text()
    }

    public static async getPck(ip: string) {
        const url = `https://${ip}:5000/users/pck`
        const response = await fetch(url, {
            method: 'GET',
        })
        return await response.json()
    }

    public static async getPsk(ip: string, id: string) {
        const url = `https://${ip}:5000/users/${id}/psk`
        const response = await fetch(url, {
            method: 'GET',
        })
        return await response.text()
    }
}
