# Guide

## UI Templates

There are default templates for __Bootstrap 3__, __Ionic__ and __Semantic UI__ with according html, configure it like following.

```javascript
// On the Client
Comments.ui.config({
   template: 'bootstrap' // or ionic, semantic-ui
})
```

```semantic-ui``` is the default, because of the semantic markup that is written with it.

## Javascript API

There is a simple Javascript API to manipulate and get data about comments.

```javascript
// On Client or Server

// Get comments for an id
Comments.get('someId')
// Get count of comments for an id
Comments.getCount('someId', (err, count) => console.log(count))
// Get one comment by it's document _id
Comments.getOne('commentsDocumentId')
// Get all comments (on client only get's the ones subscribed to)
Comments.getAll()
// Add comment
Comments.add('commentsDocumentId', 'Cool document you got there!')
  .then(doc => console.log('added the comment'))
```

See the [source code](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/api.js) for the methods to manipulate comment data.

## Customization

### Templates

You can customize the output of the commentsBox by adding custom templates as parameter.
Be sure to add them as **strings** instead of template instances.

```html
<template name="myComments">
    <ul>
        {{#each comment}}
            ...
            <li>{{content}}</li>
            ...
        {{/each}}
    </ul>
</template>

<template name="myLoading">
    <div class="loading-spinner"></div>
</template>

<template name="post">
    {{> commentsBox
        id=post._id
        boxTemplate="myComments"
        loadingTemplate="myLoading"
        headerTemplate="..."
        subheaderTemplate="..."
        singleCommentTemplate="..."
        commentListTemplate="..."
        textareaTemplate="..."
    }}
</template>
```

Have a look at the [default template](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/components/commentsBox/commentsBox.html) to see what data you have available. There are predefined classes that have an action suffix on their classes, that define when to act on [certain events](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/components/commentsBox/commentsBox.js#L143) (for example create-action, edit-action and so on).

### Comment management

There are two comment statuses `pending` and `approved`. By default all comments are `approved`, but you can change the default 
comment status by providing a `defaultCommentStatus` configuration.

```js
// Server
Comments.config({
  defaultCommentStatus: 'pending',
})
```

You can then add logic in your admin interface to list the pending comments and approve them with the Javascript API.
 
```js
// Server
Meteor.methods({
  'comment-admin/retrieve-pending'() {
    // do security checks
    return Comments.getAllForStatus('pending')
  },
  'comment-admin/approve'(commentOrReplyId) {
    check(commentOrReplyId, String)
    // do security checks
    Comments.approve(commentOrReplyId)
  },
})
``` 
You can also configure if a user can see the pending comments in the widget (for example if admin).

```js
const isAdmin = () => { /*...*/ }

// Client and Server
Comments.config({
  canSeePendingComments: (referenceId, userId) => isAdmin(userId),
})
```

These methods should be sufficient to build a simple Admin UI for pending comments.

### Anonymous users

You can allow anonymous users to comment, configurable like following.

```javascript
// Client and Server
Comments.config({
  allowAnonymous: () => true,
  anonymousSalt: 'myRandomSalt'
})
```

The anonymous user gets a random user id and salt assigned when doing a user related action (liking, commentig and so on). This salt is used as an authentication for these actions and is a random string based on the configured `anonymousSalt` and user data.

### Captcha

We have removed the integration with captcha's because it distributed [adware](https://blog.sucuri.net/2015/06/sweetcaptcha-service-used-to-distribute-adware.html).
We're investigating for a reasonable alternative.

### Rating comments

It is possible to change between rating types, by default it's likes:

* **likes**: Simple upvotes
* **likes-and-dislikes**: Upvotes and downvotes
* **Stars**: Stars, based on [barbatus:star-rating](https://atmospherejs.com/barbatus/stars-rating)

```javascript
// On Client and Server
Comments.config({
  rating: 'stars' // or null if no rating method should be used
})
```

### Published data

If you do not want to publish certain user data by default you can configure the fields by specifying `publishUserFields`.

```javascript
// Client and Server
Comments.config({
  publishUserFields: {
    profile: 1
  },
  generateUsername: function (user) {
     return user.profile.username
  }
})
```

If you want to have custom logic that defines the username you can define a `generateUsername` function that returns the username as you want it displayed in the comments box.

### Custom avatars

You can set custom avatars per user by using the `generateAvatar` function.

```javascript
// On Client
Comments.ui.config({
  generateAvatar: function (user, isAnonymous) {
    return user.profile.username
  },
  defaultAvatar: '...' // fallback
})
```

### Media

Comments UI analyzes the comments to find different types of media, by using analyzers. By default it displays images or youtube videos if links are found in the content. It is freely customizable / extendable.

```javascript
const myAnalyzer = {
  name: 'twitter',
  getMediaFromContent(content) {}, // return a string
  getMarkup(mediaContent) {}, // return a string
}

// Client and Server
Comments.config({
  mediaAnalyzers: [
    Comments.analyzers.image,
    Comments.analyzers.youtube,
    myAnalyzer
  ]
})
```

Have a look at the [image analyzer code](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/services/media-analyzers/image.js) to see how an implementation might look like.

### Schema

Changing the [Simple Schema](https://github.com/aldeed/meteor-simple-schema) definition is possible by using ```changeSchema```.

```javascript
Comments.changeSchema(function (currentSchema) {
  currentSchema.metaInfo = { type: Object, optional: true }
})
```

### Text Strings

You might see that there is a lot of predefined texts that are shown in the commentsBox component. You can change those by calling a __setContent__
method.

```javascript
Comments.ui.setContent({
  title: 'Kommentieren',
  save: 'Speichern',
  reply: 'Antworten',
  edit: 'Editieren',
  remove:'Elimiar',
  'placeholder-textarea': 'Teile uns deine Meinung mit',
  'add-button-reply': 'Antwort hinzufügen',
  'add-button': 'Kommentar hinzufügen',
  'load-more': 'Mehr Kommentare laden',
  'comment-is-pending':'Pendiente de aprovacion',
  'you-need-to-login':'Necesitas iniciar sesion para ',
  'add comments':'agregar comentarios',
  'add replies':'agregar respuestas',
  'like comments':'darle me gusta a comentarios',
  'dislike comments':'darle no me gusta a comentarios',
  'rate comments':'calificar',
  'remove comments':'eliminar comentarios'
})
```

The configurable values are:

* __title__ Title of the box
* __add-button__ Button text for adding comments
* __placeholder-textarea__ Placeholder for commenting textarea
* __save__, __edit__  and __remove__ Action texts
* __load-more__ Load more button text
* __comment-is-pending__ Comment is pending for approval text

Also you can change the language of the legend ('x minutes ago') to your own languaje with the packaje [rzymek:moment-locales](https://atmospherejs.com/rzymek/moment-locales)


### Comment actions

You can define custom actions that can be used on a comment / reply. An example could be sharing.

```javascript
Comments.ui.config({
  commentActions: [
    {
      cssClass: 'share-action',
      text: {
        key: 'share',
        defaultText: 'Share'
      }
    }
  ],
})
```

The css class can be used to trigger an onclick action. The `key` property referes to the text string that can be used
to translate the comment box.

## Event hooks

You can hook into various events using `onEvent`. This allows you to
add notifications when someone replied, liked, edited or added a comment / reply.

```javascript
// On Server or Client (preferably on Server)
Comments.config({
  onEvent: (name, action, payload) => {
    // e.g send a mail
  }
})
```

## Configurable values

You can configure following values that change the UI functionality.

```javascript
Comments.ui.config({
  limit: 5,
  loadMoreCount: 10,
  template: 'semantic-ui',
  defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png',
  markdown: false,
  commentActions: [],
})
```

There is also a general comments config that changes functionality on more than just the UI.
The `referenceId` parameter in the `allow` methods is only available on the server.

```javascript
Comments.config({
  allowReplies: ([referenceId]) => true,
  allowAnonymous: ([referenceId]) => false,
  rating: 'likes',
  anonymousSalt: 'changeMe',
  mediaAnalyzers: [Comments.analyzers.image],
  publishUserFields: { profile: 1, emails: 1, username: 1 }
})
```
