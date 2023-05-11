/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ImageField } from './ImageField';

/**
 * Infills transparent areas of an image with tiles of the image
 */
export type InfillPatchMatchInvocation = {
  /**
   * The id of this node. Must be unique among all nodes.
   */
  id: string;
  type?: 'infill_patchmatch';
  /**
   * The image to infill
   */
  image?: ImageField;
};

