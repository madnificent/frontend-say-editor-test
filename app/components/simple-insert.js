import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
/**
 * @typedef {Object} Args
 * @property {SayController} controller
 */
export default class SimpleInsertComponent extends Component {
  @tracked modalOpen = false;
  @tracked coolThings = [];
  get controller() {
    return this.args.controller;
  }
  @action
  async openModal() {
    // this may seem strange, but we need to focus the editor BEFORE we open the modal
    // if we want it to be focussed when we close it. This is because the modal
    // uses ember-focus-trap, which takes over focus and gives it back to the
    // last element that was focused when it is disabled (i.e. when the modal
    // closes)
    this.controller.focus();
    this.modalOpen = true;
    // or use ember-resources or something, you know how to do this
    await this.fetchCoolThings();
  }
  @action
  closeModal() {
    this.modalOpen = false;
  }
  @action
  async fetchCoolThings() {
    this.coolThings = [
      'I am amazed!',
      `<div><div>Arne knows it's good to put this div first now</div><div about="https://redpencil.io/" typeof="schema:Company"><span property="http://purl.org/dc/terms/label">redpencil.io</span></div>`,
      'And <strong>you</strong> are amazing.'
    ];
  }
  @action
  insertThing(thing) {
    const { from, to } = this.controller.mainEditorState.selection;
    // thing can of course be any html, which will be parsed by the schema you
    // have configured. If you need to do something more fancy than inserting
    // html, you can try to get some inspiration from https://github.com/lblod/ember-rdfa-editor-lblod-plugins
    // you'll notice the insert-component with a modal is a common pattern, but
    // is usually combined with a custom nodespec which gets added to the schema
    // this combo is very powerful, but requires understanding of how nodespecs
    // work, see https://prosemirror.net/docs/guide/#schema
    // I don't recommend diving into this in a hackathon, unless you can get
    // help from someone with experience.
    //
    // KEEP IN MIND: html you insert will be stripped of its attributes, and
    // likely mangled to fit the schema. Class attributes, ids, etc will be
    // stripped. In short: don't expect this to look like what you put in.
    //
    // Things that the editor can create will likely look good, such as: tables,
    // lists, bold text, headers, etc
    //
    // RDFA attributes will be saved because the schema I've set up contains the
    // block_rdfa and inline_rdfa nodes, which specifically parse those
    // attributes, but they might not render the way you want.
    // Once again, if you need to preserve other attributes, nodespecs are the answer.
    //
    this.controller.setHtmlContent(thing, {
      range: { from, to },
    });
    this.closeModal();
  }
}
