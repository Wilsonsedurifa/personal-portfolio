/* SVG transform attributes carry each workflow node's actual coordinates.
   Preserve them so CSS reveal effects cannot collapse every node at (0, 0). */
(() => {
  const restoreFlowCoordinates = () => {
    document.querySelectorAll('.flow-diagram .flow-nodes > g[transform]').forEach(node => {
      const match = node.getAttribute('transform').match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
      if (match) node.style.transform = `translate(${match[1]}px, ${match[2]}px)`;
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreFlowCoordinates, { once: true });
  } else {
    restoreFlowCoordinates();
  }
})();
