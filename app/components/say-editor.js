import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { firefoxCursorFix } from '@lblod/ember-rdfa-editor/plugins/firefox-cursor-fix';
import { lastKeyPressedPlugin } from '@lblod/ember-rdfa-editor/plugins/last-key-pressed';
import { chromeHacksPlugin } from '@lblod/ember-rdfa-editor/plugins/chrome-hacks-plugin';
import { Schema } from '@lblod/ember-rdfa-editor';
import {
  em,
  strikethrough,
  strong,
  subscript,
  superscript,
  underline,
} from '@lblod/ember-rdfa-editor/plugins/text-style';
import {
  blockRdfaWithConfig,
  docWithConfig,
  hard_break,
  horizontal_rule,
  invisibleRdfaWithConfig,
  paragraph,
  repairedBlockWithConfig,
  text,
} from '@lblod/ember-rdfa-editor/nodes';
import {
  tableKeymap,
  tableNodes,
  tablePlugins,
} from '@lblod/ember-rdfa-editor/plugins/table';
import {
  bulletListWithConfig,
  listItemWithConfig,
  listTrackingPlugin,
  orderedListWithConfig,
} from '@lblod/ember-rdfa-editor/plugins/list';
import { placeholder } from '@lblod/ember-rdfa-editor/plugins/placeholder';
import { headingWithConfig } from '@lblod/ember-rdfa-editor/plugins/heading';
import { blockquote } from '@lblod/ember-rdfa-editor/plugins/blockquote';
import { code_block } from '@lblod/ember-rdfa-editor/plugins/code';
import { image, imageView } from '@lblod/ember-rdfa-editor/plugins/image';
import {
  link,
  linkView,
  linkPasteHandler,
} from '@lblod/ember-rdfa-editor/plugins/link';
import { highlight } from '@lblod/ember-rdfa-editor/plugins/highlight/marks/highlight';
import { color } from '@lblod/ember-rdfa-editor/plugins/color/marks/color';
import { undo } from '@lblod/ember-rdfa-editor/plugins/history';
import {
  inlineRdfaWithConfig,
  inlineRdfaWithConfigView,
} from '@lblod/ember-rdfa-editor/nodes/inline-rdfa';
// A basic editor setup
// IMPORTANT: don't expect to edit RDFA on the fly with this. This setup is
// basically just giving you a rich text editor that doesn't throw away rdfa
// knowledge, that's about it. We do have a feature that can actually create and edit RDFA, but it
// requires more setup, and is not very user friendly yet.
export default class SayEditorComponent extends Component {
  @tracked controller;
  // the schema determines the allowed content in the editor. The one I gave
  // here supports pretty much all the base rich text features we have.
  //
  // each element of the schema (whether it be a node or a mark) essentially
  // defines the 2-way conversion from html to prosemirror's internal
  // representation and back again, but you likely won't have to worry about
  // that
  //
  // this can NOT be a getter! the editor can't deal with a reactive schema as
  // it's the foundation of the entire instance.
  schema = new Schema({
    nodes: {
      doc: docWithConfig({ rdfaAware: true }),
      paragraph,
      // a kludge for a common misuse of html
      // the editor is VERY strict about html correctness, and the html
      // spec is more restrictive than you might think. browsers just happen to
      // be unbelievably good at rendering out-of-spec or even broken html
      repaired_block: repairedBlockWithConfig({ rdfaAware: true }),
      list_item: listItemWithConfig({ enableHierarchicalList: true }),
      ordered_list: orderedListWithConfig({ enableHierarchicalList: true }),
      bullet_list: bulletListWithConfig({ enableHierarchicalList: true }),
      placeholder,
      ...tableNodes({ tableGroup: 'block', cellContent: 'block+' }),
      heading: headingWithConfig({ rdfaAware: true }),
      blockquote,
      horizontal_rule,
      code_block,
      text,
      image,
      hard_break,
      block_rdfa: blockRdfaWithConfig({ rdfaAware: true }),
      // unlikely to matter, but this is here so that rdfa nodes with only data
      // and no content aren't thrown away (by default the editor throws away
      // empty nodes)
      invisible_rdfa: invisibleRdfaWithConfig({ rdfaAware: true }),
      inline_rdfa: inlineRdfaWithConfig({ rdfaAware: true }),
      link: link(this.config.link),
    },
    // marks are like text properties
    marks: {
      em,
      strong,
      underline,
      strikethrough,
      subscript,
      superscript,
      highlight,
      color,
    },
  });
  // this is how we typically check if an editor has had changes since it's
  // initial load. This basically checks: "can I undo anything?" and if not,
  // there are no changes
  // it's not 100% waterproof but it works better than the alternatives
  get dirty() {
    return this.controller?.checkCommand(undo, {
      view: this.controller?.mainEditorView,
    });
  }
  // you'll see this is simply an object passed around to some plugins/plugin
  // components that need it, no magic
  get config() {
    return {
      link: {
        interactive: true,
        rdfaAware: true,
      },
    };
  }
  // plugins here are specifically plugins as ProseMirror defines them:
  // https://prosemirror.net/docs/guide/#state.plugins
  // They're essentially just functions that hook into each state transformation
  // (each edit you make, even typing a single letter, generates a new state)
  // You likely won't need to make one of these, but I'm adding this comment to
  // make the distinction with a generic idea of a "plugin" clear
  //
  // note: make sure to include the firefox and chrome hacks plugins, and the
  // lastKeyPressedPlugin no matter what you do, even if you're not using tables
  // and lists
  //
  //
  // some of these are exposed as functions that return the actual plugin
  // function (for taking config), some are just the plain plugin function,
  // which is why some are called and others aren't
  get plugins() {
    return [
      ...tablePlugins,
      tableKeymap,
      linkPasteHandler(this.schema.nodes.link),
      listTrackingPlugin(),
      firefoxCursorFix(),
      lastKeyPressedPlugin,
      chromeHacksPlugin(),
      //(this.args.shouldEditRdfa || this.args.shouldShowRdfa) &&
      //  editableNodePlugin()
    ];
  }
  // you can think of these almost as ember components (many of them actually
  // are)
  // they're essentially saying to prosemirror: hey, for these nodes, I'll take
  // care of the rendering, you just worry about the rest
  get nodeViews() {
    return (controller) => {
      return {
        link: linkView(this.config.link)(controller),
        image: imageView(controller),
        inline_rdfa: inlineRdfaWithConfigView({ rdfaAware: true })(controller),
      };
    };
  }
  // this is how you get the content out of the editor, for example to save it
  // in a DB. Note this will be different than what you'll see in the inspector
  // in a running editor instance, because in the running instance there's a
  // bunch of html that is only there for the interactive elements. When
  // serializing, those get transformed into their static representation.
  //
  // all properties on a controller are tracked, so this integrates into ember
  // like you would expect. To showcase this, I've simply rendered this content
  // below the editor, you'll get a live view of what html it generates.
  get content() {
    // you always have to check for existence, as the controller only exists
    // after the editor loads.
    if (this.controller) {
      return this.controller.htmlContent;
    }
    return '';
  }
  // and this is how you load content into the editor (this will fully replace
  // the current content, so this is meant for initial load)
  // see simple-insert.js for how to insert content without replacing everything
  initialize(html) {
    this.controller.initialize(html);
  }
  // the editor calls this when it's done loading, and gives you a controller.
  // this is basically your single interface that you can fully control the
  // editor with. The only things you can't do are adding plugins or changing
  // the schema on the fly
  // https://github.com/lblod/ember-rdfa-editor/blob/master/addon/core/say-controller.ts
  // it's meant to be passed around at will, so go nuts
  // (to pass it upwards, simply repeat the pattern and accept an init function
  // argument)
  @action
  rdfaEditorInit(controller) {
    this.controller = controller;
  }
}
