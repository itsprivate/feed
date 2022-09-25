<!DOCTYPE html>
<html lang="{{ language }}" class="h-feed hfeed">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ title }}{{_title_suffix}}</title>
    {{#keywords}}
    <meta name="keywords" content="{{ keywords }}" />
    {{/keywords}}
    <meta name="name" content="{{title}}" />
    {{#_image}}
    <meta name="image" content="{{{_image}}}" />
    {{/_image}}
    <meta
      name="description"
      content="{{{description}}}"
    />
    <meta property="og:url" content="{{{home_page_url}}}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{{ title }}" />
    {{#_image}}
    <meta property="og:image" content="{{{_image}}}" />
    <meta property="og:image:alt" content="{{ title }}" />
    {{/_image}}
    <meta property="og:description" content="{{ description }}" />
    <meta property="og:site_name" content="{{ title }}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:site" content="@buzzingcc" />
    <meta name="twitter:url" content="{{{home_page_url}}}" />
    <meta name="twitter:title" content="{{ title }}" />
    <meta name="twitter:description" content="{{ description }}" />
    {{#_image}}
    <meta name="twitter:image" content="{{{_image}}}" />
    <meta name="twitter:image:alt" content="{{ title }}" />
    {{/_image}}
    <meta property="og:locale" content="{{ language }}" />
    {{#_rss_url}}
    <link
      rel="alternate"
      href="{{{_rss_url}}}"
      type="application/rss+xml"
      title="{{ title }}"
    />
    {{/_rss_url}}
    {{#_atom_url}}
     <link
      rel="alternate"
      href="{{{_atom_url}}}"
      type="application/atom+xml"
      title="{{ title }}"
    />
    {{/_atom_url}}
    <link
      rel="alternate"
      href="{{{feed_url}}}"
      type="application/feed+json"
      title="{{ title }}"
    />
    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="{{{icon}}}"
      type="image/png"
    />
    <link rel="icon" href="{{{favicon}}}" />
    <style>
      body {
        max-width: 45em;
        margin: 0 auto;
        padding: 0;
        background-color: #fffff8;
        line-height: 1.5em;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Helvetica, sans-serif;
      }
      img {
        max-width: 95%;
        {{#_max_image_height}}
        max-height: {{_max_image_height}}px;
        {{/_max_image_height}}
        {{^_max_image_height}}
        max-height: 14em;
        {{/_max_image_height}}
        border-radius: 0.5em;
        height: auto;
      }
      video {
        max-width: 90%;
        max-height: 32em;
        height: auto;
      }
      .embed-video {
        aspect-ratio: 16 / 9;
        width: 85%;
      }
      a:link {
        color: rgb(0, 102, 204);
      }
      a:hover {
        text-decoration: underline;
        color: rgb(0, 102, 204);
      }
      .header{
        padding-top: 0.5em;
        padding-left: 1em;
        padding-right: 1em;
      }
      .footer{
        margin-bottom: 2em;
        padding-left: 1em;
        padding-right: 1em;
        padding-top: 2em;
      }
      .article {
        border-radius: 0.5em;
        {{#_is_lite}}
        padding: 4px 1em;
        {{/_is_lite}}
        {{^_is_lite}}
        padding: 0.5em 1em;
        {{/_is_lite}}
      }
      .article footer{
        {{#_is_lite}}
        margin-top: 0;
        {{/_is_lite}}
        {{^_is_lite}}
        margin-top: 0.5em;
        {{/_is_lite}}
      }

      .pre-line {
        white-space: pre-line;
      }
      .small{
        font-size: 0.9375em;
      }
      .muted {
        color: #828282;
      }
      a.muted:link,a.muted:visited {
        color: #828282;
        text-decoration: none;
      }

      a.muted:hover{
        text-decoration: underline;
        color: rgb(0, 102, 204);
      }
      .secondary a:link,.secondary a:visited {
        color: #828282;
      }
      .secondary a:hover{
        color: rgb(0, 102, 204);
      }
      .italic{
        font-style: italic;
      }
      .contrast a:link,
      .contrast a:visited {
        color: initial;
      }
      .contrast a:hover {
        color: rgb(0, 102, 204);
      }
      a.contrast:link ,
      a.contrast:visited  {
        color: initial;
      }
      a.contrast:hover {
        color: rgb(0, 102, 204);
      }
      .no-underline {
        text-decoration: none;
      }
      .no-underline:hover {
        text-decoration: underline;
        color: rgb(0, 102, 204);
      }
      .details,
      .less,
      .more:target {
        display: none;
      }
      .more:target ~ .details {
        display: block;
      }
      .more:target ~ .less {
        display: inline;
      }

      .about-content,
      .less-about,
      .about:target {
        display: none;
      }
      .about:target ~ .about-content {
        display: block;
      }
      .about:target ~ .less-about {
        display: inline;
      }
      .bold {
        font-weight: 500;
      }
      .mb {
        {{#_is_lite}}
        margin-bottom: 4px;
        {{/_is_lite}}
        {{^_is_lite}}
        margin-bottom: 0.5em;
        {{/_is_lite}}
      }
      .px {
        padding-left: 1em;
        padding-right: 1em;
      }
      .border-bottom {
        height: 1px;
        border-bottom: 1px dashed #d4d4d4;

      }
      .w-50 {
        width: 50%;
      }
      .fixed{
        position: fixed;
        bottom: 2em;
        right: 0.5em;  
        font-weight: bold;
        z-index:1;
      }
      .inline-block{
        display: block;
      }
      .nsfw{
        color: #d10023;
        font-size:small;
      }
      .mt0{
        margin-top: 0;
      }
      @media print{    
        .fixed{
            display: none;
        }
        header{
            display: none;
        }
        .footer{
            display: none;
        }

      }
    </style>
  </head>
  <body>
    <div id="top"></div>
    <header class="header">
      <a class="contrast no-underline small" href="{{{_site_url}}}">{{
        _site_title
      }}</a>
      <span> · </span>
      <a id="about" href="#about" class="about muted small">{{
        about_label
      }}</a>
      <a href="#" class="less-about muted small">{{ less_label }}</a>
      <span> · </span>
      {{#_related_sites}}
      <a class="muted small" href="{{{url}}}">{{ name }}</a
      >{{^is_last}}<span> · </span>{{/is_last}}
      {{/_related_sites}}
      {{#_other_sites.0}}
      <a id="more" href="#more" class="more muted small">+ {{ more_label }}</a>
      <a id="less" href="#" class="less muted small">- {{ less_label }}</a>
      <div class="details small">
        {{/_other_sites.0}} {{#_other_sites}}
        <a class="muted" href="{{{url}}}">{{ name }}</a
        >{{^is_last}}<span> · </span>{{/is_last}} {{/_other_sites}}
        {{#_other_sites.0}}
      </div>
      {{/_other_sites.0}}
      <div class="about-content contrast small">
        <p class="p-summary site-description">{{ description }}</p>
        <div>
        {{ version_label }}: 
          <ul>
          {{#_versions}}
            <li>
              {{#active}}
                <span>{{ name }}</span>
              {{/active}}
              {{^active}}
                <a href="{{{url}}}">{{ name }} </a>
              {{/active}}
            </li>
          {{/_versions}}
          </ul>
          {{ languages_label }}: 
          <ul>
          {{#_languages}}
            <li>
              {{#active}}
                <span>{{ name }}</span>
              {{/active}} 
              {{^active}}
                <a href="{{{url}}}">{{ name }}</a>
              {{/active}}
            </li>
          {{/_languages}}
          </ul>
          {{ subscription_label }}: 
          <ul>
          {{#_atom_url}}
            <li><a href="{{{_atom_url}}}">Atom/RSS Feed</a></li>
          {{/_atom_url}}
          {{#feed_url}}
            <li><a href="{{{feed_url}}}">JSON Feed</a></li>
          {{/feed_url}}
          </ul>
          {{social_label}}: 
          <ul>
          {{#_social_links}}<li><a href="{{url}}">{{name}}</a></li>{{/_social_links}}
          </ul>
          {{#_sources.0}}
          {{ sources_label }}: 
           <ul>
          {{#_sources}}<li><a href="{{url}}">{{name}}</a></li>{{/_sources}}
          </ul>          
          {{/_sources.0}}
          {{latest_build_at_lable}}: {{_latest_build_time}}
          <br />
          {{ powered_by_label }}:
          <a href="https://www.owenyoung.com">Owen</a> (<a href="https://twitter.com/OwenYoungZh">Twitter</a>)
        </div>
      </div>
      {{#_page_title}}
      <h3>{{.}}</h3>
      {{/_page_title}}
    </header>

    {{#items}}
    <article class="article h-entry hentry">
      <h4 class="mb mt0">
        <a class="p-name entry-title bold no-underline u-url" href="{{{url}}}">{{#order}}<span>{{ . }}. </span>{{/order}}{{{title}}}</a>{{#_sensitive}}<span>&nbsp;(</span><span class="nsfw">NSFW</span><span>)</span>{{/_sensitive}}
      </h4>
      <div class="p-summary entry-summary secondary pre-line small italic">{{{content_html}}}</div>
    </article>
    {{/items}}
    <footer class="footer">
      {{#_issue_list.0}}
      <details>
        <summary>{{ issues_label }}</summary>
        <p>
          <cite>
            {{#_issue_list}}
            <a class="no-underline" href="{{{url}}}">{{ name }}</a
            >{{^is_last}}<span>&nbsp;&nbsp;</span>{{/is_last}} {{/_issue_list}}
          </cite>
        </p>
      </details>
      {{/_issue_list.0}}

      {{#_tag_list.0}}
      <details>
        <summary>{{ tags_label }}</summary>
        <p>
          <cite>
            {{#_tag_list}}
            <a class="no-underline" href="{{{url}}}">#{{ name }}</a
            >{{^is_last}}<span>&nbsp;&nbsp;</span>{{/is_last}} {{/_tag_list}}
          </cite>
        </p>
      </details>
      {{/_tag_list.0}}

      {{#_archive_list.0}}
      <details>
        <summary>{{ archive_label }}</summary>
        <p>
          <cite>
            {{#_archive_list}}
            <a class="no-underline" href="{{{url}}}">{{ name }}</a
            >{{^is_last}}<span>&nbsp;&nbsp;</span>{{/is_last}}
            {{/_archive_list}}</cite
          >
        </p>
      </details>
      {{/_archive_list.0}}
    </footer>
    <div id="bottom"></div>
    <div class="fixed">
      <div class="mb">
        <a class="no-underline contrast" title="Go to Top" href="#top">&uarr;</a>
      </div>
      <div>
        <a class="no-underline contrast" title="Go to Bottom" href="#bottom">&darr;</a>
    </div>
   </div>
  </body>
</html>
