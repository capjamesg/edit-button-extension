# Edit Button Browser Extension

A browser extension that adds an edit button the URL bar when a page is editable.

The following algorithm is used to determine if a page is editable:

1. Is there a [rel=edit](microformats.org/wiki/rel-edit) link on the page? If so, choose the `href` as the edit link to show the user.
2. Is there a `rel=alternate type=application/x-wiki` `link` tag on the page? If so, choose the `href` as the page edit link.
3. Are there any links with an anchor text that would indicate a page is editable, like "Edit this page"? If so, choose the first anchor whose text indicates a page is editable. (This step is opt-in in the extension settings).

## Install

The Edit Button browser extension is available on:

- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/edit-button-rel/)

Review is pending on:

- Chrome
- Edge

Safari support is in development.

## Example

https://github.com/user-attachments/assets/8b21ece3-5925-4ef5-a49b-e4d419bdecb4

## Supported Sites

The following sites have been tested and work well with the Edit Button Browser Extension, in alphabetical order by primary domain:
* https://wiki.csswg.org/
* https://indieweb.org/
* https://microformats.org/wiki/
* https://wiki.mozilla.org/
* https://www.w3.org/wiki/
* https://wiki.whatwg.org/
* https://www.wikipedia.org/

## Security Considerations

### Cross-origin edit links

A website may publish a rel=edit link to any origin.

This extension asks the user to confirm that they want to open an edit link if the origin of the edit link is different from the origin of the page they are viewing.

For example, suppose a user is viewing `example.com` and there is a `rel=edit` link that points to `example.org`. The user will be asked to approve `example.org` as an editing origin for `example.com`.

Approved and denied origins can be viewed by the user from the extension preferences page.

## Release Checklist

- [ ] Test the extension on:
    - Firefox
    - Chrome
    - Safari (macOS)
    - Safari (iOS)
    - Edge
    - Firefox for Android
- [ ] The `manifest.json` and `edge_manifest.json` version numbers have been updated.
- [ ] Run `build.zip`.
- [ ] Release extension via each distribution channel.

## Contributing

Contributions are welcome!

If you have encountered a bug, please open an Issue describing the bug.

If you have an idea for a feature, please open an Issue describing your idea and whether you are willing to submit a Pull Request. Please do not submit a PR without discussing your idea with a Maintainer first.

## License

This project is licensed under an [MIT License](LICENSE).
