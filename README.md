# Meteor Comments UI

This package lets you add __disqus like__ comment functionality in a matter of seconds. Comments-ui uses the Meteor accounts system which (in constrast to disqus) makes it easy to get the data and use it to your wishes.

```html
<div class="comment-section">
    {{> commentsBox id=documentId}}
</div>
```

## How to install

```bash
meteor add arkham:comments-ui
```

## UI Templates

There are two default templates for Bootstrap 3 and Semantic UI with according html, configure it like following.

```javascript
// On the Client
Comments.ui.config({
    templates: 'bootstrap'
});
```

```semantic-ui``` is the default, because of the semantic markup that is written with it.

## Custom text strings

You might see that there is a lot of predefined text that is shown in the commentsBox component. You can change those by passing a __content__
parameter in the html.

```javascript
Template.blogPost.helpers({
    strings: function () {
        return {
            'title': 'Kommentare',
            'add-button': 'Kommentar hinzufügen'
        };
    },
    ...
});
```

```html
<template name="blogPost">
    {{> commentsBox id=blogPostId content=strings}}
</template>
```

The configurable values are:

* __title__ Title of the box
* __add-button__ Button text for adding comments
* __placeholder-textarea__ Placeholder for commenting textarea
* __save__, __edit__  and __remove__ Action texts
* __load-more__ Load more button text

## Configurable values

You can configure following values that changed the comments-ui functionality.

```javascript
Comments.ui.config({
    limit: 10, // default 30
    loadMoreCount: 20, // default 20
    template: 'bootstrap', // default 'semantic-ui'
    defaultAvatar: 'my/defaultavatarimage.png' // default 'http://s3.amazonaws.com/37assets/svn/765-default-avatar.png'
});
```
