/*
 * message.js
 * This file contains your bot code
 */

import RECASTAI from 'recastai'
import su from 'superagent'
import {frenchReply, englishReply} from './langue'

function GetFBInfo (userId, FB) {
  return new Promise((resolve, reject) => {
    su.get('https://graph.facebook.com/v2.6/' + userId)
    .query({fields: 'first_name,last_name,locale,gender', access_token: FB})
    .end((err, res) => {
      if (err) resolve(null)
      else {
        if (res.status === 200) {
          resolve(JSON.parse(res.text))
        } else {
          resolve(null)
        }
      }
    })
  })
}

const replyMessage = async (message) => {
  // Instantiate Recast.AI SDK, just for request service
  const client = new RECASTAI(process.env.REQUEST_TOKEN)

  const request = client.request
  const text = message.content

  console.log('I receive: ', text)

  const senderId = message.senderId
  const userName = message.message.data.userName

  var isFB = false
  var local = null
  try {
    const FBquery = await GetFBInfo(senderId, process.env.PAGES)
    if (FBquery && FBquery.first_name && FBquery.last_name && FBquery.locale && (FBquery.first_name + ' ' + FBquery.last_name === userName)) {
      local = FBquery.locale.replace(/\w+_/g, '')
      isFB = true
    }
  } catch (e) {
    isFB = false
  }
  console.log('isFB: ', isFB)

  console.log('AppUserId: ', senderId)

  console.log('conversationToken: ', message.conversationId)
  // Call Recast.AI SDK, through /converse route

  request.converseText(text, { conversationToken: senderId })
  .then(async result => {
    // while (result.action && result.action.slug && result.action.slug !== 'oui' && result.replies.length > 1) {
    //   result.replies.pop()
    // }
    console.log(result.replies.length)
    const length = result.replies.length - 1
    /*
    * YOUR OWN CODE
    * Here, you can add your own process.
    * Ex: You can call any external API
    * Or: Update your mongo DB
    * etc...
    */
    if (result.action) {
      console.log('The conversation action is: ', result.action.slug)
    }

    if (!result.replies.length) {
      message.addReply({ type: 'text', content: 'I don\'t have the reply to this yet :)' })
    } else {
      if (result.language === 'fr') {
        try {
          message = await frenchReply(result, message, text, isFB, local, length)
        } catch (e) {
          message = message.addReply({ type: 'text', content: 'Une erreur est survenue, veuillez nous en excuser' })
        }
      } else {
        try {
          message = await englishReply(result, message, text, isFB, local, length)
        } catch (e) {
          message = message.addReply({ type: 'text', content: 'An error has occurred, please excuse us' })
        }
      }
    }

    message.reply()
    .then(() => {
      // Do some code after sending messages
    })
    .catch(err => {
      console.error('Error while sending message to channel', err)
    })
  })
  .catch(err => {
    console.error('Error while sending message to Recast.AI', err)
  })
}

export default replyMessage
