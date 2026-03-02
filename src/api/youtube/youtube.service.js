import request from 'superagent'

class YoutubeService {
  #CHANNEL_ID
  constructor () {
    this.#CHANNEL_ID = 'UCNlCF9dH_nGvpap6ROdlQuQ'
  }

  async getChannelVideos({ items }) {
    return new Promise((resolve, reject) => {
      request
        .get('https://www.googleapis.com/youtube/v3/search')
        .query({
          channelId: this.#CHANNEL_ID,
          key: process.env.GOOGLE_API_KEY,
          maxResults: items ?? 10,
          order: 'date',
          part: 'snippet,id'
        })
        .end((err, res) => {
          if (err) {
            return reject(err)
          }

          return resolve(
            JSON.parse(res.text)
          )
        })
    })
  }
}

export { YoutubeService }
