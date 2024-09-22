import { service } from '@ember/service';
import Route from '@ember/routing/route';

export default class ApplicationRoute extends Route {
  @service intl;
  beforeModel() {
    this.intl.setLocale(['en-us']);
  }
}
