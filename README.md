# Meteor Comments UI

This package lets you add __disqus like__ comment functionality in a matter of seconds.
Comments-ui uses the Meteor accounts system which (in constrast to disqus) makes it easy to get the data and use it to your wishes.
If you want to see how it looks like you can check out the [screenshot](https://raw.githubusercontent.com/ARKHAM-Enterprises/meteor-comments-ui/master/screenshot.png).

```html
<div class="comment-section">
    {{> commentsBox id=documentId}}
</div>
```

```documentId``` could be the id of a blog post, news article or a custom defined string that stands for your guestbook.

## How to install

```bash
meteor add arkham:comments-ui
```

Have a look at the [GUIDE.md](https://github.com/ARKHAM-Enterprises/meteor-comments-ui/blob/master/GUIDE.md) for a detailed explanation of the Javascript API and configuration.
