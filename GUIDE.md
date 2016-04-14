# Guide 

## UI Templates

There are default templates for __Bootstrap 3__, __Ionic__ and __Semantic UI__ with according html, configure it like following.

```javascript
// On the Client
Comments.ui.config({
   template: 'bootstrap' // or ionic, semantic-ui
});
```

```semantic-ui``` is the default, because of the semantic markup that is written with it.

## Javascript API

There is a simple Javascript API to manipulate and get data about comments.

```javascript
// On Client or Server

// Get comments for an id
Comments.get('someId');
// Get count of comments for an id
Comments.getCount('someId', (err, count) => console.log(count));
// Get one comment by it's document _id
Comments.getOne('commentsDocumentId');
// Get all comments (on client only get's the ones subscribed to)
Comments.getAll();
```

See the source code for the methods to manipulate comment data.

## Customization

### Templates

You can customize the output of the commentsBox by adding custom templates as parameter.

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
	 }}
</template>
```

Have a look at the [default template](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/components/commentsBox/commentsBox.html) to see what data you have available. There are predefined classes that have an action suffix on their classes, that define when to act on [certain events](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/lib/components/commentsBox/commentsBox.js#L143) (for example create-action, edit-action and so on).

### Anonymous users

You can allow anonymous users to comment, configurable like following.

```javascript
// Client and Server
Comments.config({
  anonymous: true,
  anonymousSalt: 'myRandomSalt'
});
```

The anonymous user gets a random user id and salt assigned when doing a user related action (liking, commentig and so on). This salt is used as an authentication for these actions and is a random string based on the configured `anonymousSalt` and user data.

### Rating comments

It is possible to change between rating types, by default it's likes:

* **likes**: Simple upvotes
* **Stars**: Stars, based on [barbatus:star-rating](https://atmospherejs.com/barbatus/stars-rating)

```javascript
// On Client and Server
Comments.config({
  rating: 'stars' // or null if no rating method should be used  
});
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
     return user.profile.username;
  }
});
```

If you want to have custom logic that defines the username you can define a `generateUsername` function that returns the username as you want it displayed in the comments box.

### Media

Comments UI analyzes the comments to find different types of media, by using analyzers. By default it displays images or youtube videos if links are found in the content. It is freely customizable / extendable.

```javascript
const myAnalyzer = {
  name: 'twitter',
  getMediaFromContent(content) {}, // return a string
  getMarkup(mediaContent) {}, // return a string
};

// Client and Server
Comments.config({
  mediaAnalyzers: [
    Comments.analyzers.image,
    Comments.analyzers.youtube,
    myAnalyzer
  ]
});
```

Have a look at the [image analyzer code](#) to see how an implementation might look like.

### Schema

Changing the [Simple Schema](https://github.com/aldeed/meteor-simple-schema) definition is possible by using ```changeSchema```.

```javascript
Comments.changeSchema(function (currentSchema) {
  currentSchema.metaInfo = { type: Object, optional: true };
});
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
  'placeholder-textarea': 'Teile uns deine Meinung mit',
  'add-button-reply': 'Antwort hinzufügen',
  'add-button': 'Kommentar hinzufügen',
  'load-more': 'Mehr Kommentare laden'
});
```

The configurable values are:

* __title__ Title of the box
* __add-button__ Button text for adding comments
* __placeholder-textarea__ Placeholder for commenting textarea
* __save__, __edit__  and __remove__ Action texts
* __load-more__ Load more button text

## Event hooks

You can hook into various events using `onEvent`. This allows you to
add notifications when someone replied, liked, edited or added a comment / reply.

```javascript
// On Server or Client (preferably on Server)
Comments.config({
  onEvent: (name, action, payload) => {
    // e.g send a mail
  }
});
```

## Configurable values

You can configure following values that change the UI functionality.

```javascript
Comments.ui.config({
  limit: 5,
  loadMoreCount: 10,
  template: 'semantic-ui',
  defaultAvatar:'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png',
  markdown: false
});
```

There is also a general comments config that changes functionality on more than just the UI.

```javascript
Comments.config({
  replies: true,
  anonymous: false,
  rating: 'likes',
  anonymousSalt: 'changeMe',
  mediaAnalyzers: [Comments.analyzers.image],
  publishUserFields: { profile: 1, emails: 1, username: 1 }
});
```
