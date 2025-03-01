# Features

## Free features

- **Batch upload:** upload multiiple songs in one batch
- **No transcoding:** audio quality will be preserved before uploading to YouTube
- **Read metadata:** read audio metadata and use the values in [template strings](/documentation#template-strings)
  to set YouTube title and description. Supports any format supported by
  [music-metadata](https://www.npmjs.com/package/music-metadata)
- **Default values:** save default YouTube upload settings to your account

## Paid features

- **No watermark:** choonify.com watermark can be removed when uploading a song
- **No ads:** ads will not be displayed on choonify.com
- **Link multiple channels:** support for linking up to 10 YouTube channels to your account
- **More video filter options:** support for blurred background and colored background video filters

## Template strings

Choonify uses [eta](https://eta.js.org/) to render template strings.
You can use template strings as values for your default video title and default video description.
The string formatter is passed the variables `metadata` of type [ICommonTagsResult](https://github.com/Borewit/music-metadata/blob/71df30da63bed5873110c1f6a54fa7597682d416/lib/type.ts#L51), `format` of type [IFormat](https://github.com/Borewit/music-metadata/blob/71df30da63bed5873110c1f6a54fa7597682d416/lib/type.ts#L438), and `file` of type [FileWithPath](https://github.com/react-dropzone/file-selector/blob/bcddcb162d40078336d8f5d1d6f2807f648569f6/src/file.ts#L1233).

You can play around with the syntax here:

<TemplateStringPlayground/>

See the [docs](https://eta.js.org/docs/intro/template-syntax) for a full description of the template syntax.

# Limitations

## Upload quota

Choonify limits your uploads by filesize via a daily upload quota, which resets every day at 12 AM (UTC).
You can increase your daily quota by upgrading your [plan](/pricing).

## YouTube limitations

Youtube limits your uploads in several ways:

- There is an undocumented limit to the number of videos you are allowed to upload every day.
  This may increase over time if your account stays in good standing, or if you verify your account with a phone number.
  It is estimated to max out at around ~100 videos per day.
- Videos must be shorter than [15 minutes](https://support.google.com/youtube/answer/71673) if your account is not verified
- Videos must be shorter than [12 hours](https://support.google.com/youtube/answer/71673)

## Supported filetypes

Any format supported by both [FFmpeg](https://en.wikipedia.org/wiki/FFmpeg#Supported_codecs_and_formats)
and [music-metadata](https://www.npmjs.com/package/music-metadata) is supported by Choonify.
