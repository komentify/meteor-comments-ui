# Meteor Comments UI

This package lets you add "disqus" like comment boxes in a matter of seconds. In constrast to disqus, comments-ui uses the Meteor accounts system to 
retrieve user specific data for comments and likes. The following snippet makes it possible to add, like and remove comments for any desired id, in this case for
a document.

```html
<div class="comment-section">
    {{> commentsBox id=documentId}}
</div>
```



<!-- toc -->


<!-- toc stop -->
