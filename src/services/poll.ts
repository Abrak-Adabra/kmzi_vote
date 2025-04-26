export default class Poll {
    public static async getPoll(ip: string) {
        const url = `http://${ip}:5000/poll`
        const response = await fetch(url, {
            method: 'GET',
        })
        return await response.json()
    }
}
