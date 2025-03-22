/**
 * Config for the drive module
 */
export default {
  /**
   * The default disk to use for file storage
   */
  disk: "local",

  /**
   * Disks configuration
   */
  disks: {
    /**
     * The local disk for file storage
     */
    local: {
      driver: "local",
      root: "tmp",
      basePath: "/uploads",
      serveFiles: true,
    },
  },
};
